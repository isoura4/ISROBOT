// --- Global error and signal handling ---
import winston from 'winston';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import { cleanEnv, str, bool, num } from 'envalid';
import { ensureEnvKeys } from './src/ensureEnvKeys.js';
import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deployCommands } from './deploy-commands.js';
import { startStreamCheckInterval } from './src/commands/stream.js';
import { addVoiceXp } from './src/levels.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { sendTelemetry } from './src/telemetry.js';
import dbPromise from './src/database.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import validator from 'validator';
import http from 'http';
import { getGuildLanguageFor } from './src/commands/language.js';

process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  Sentry.captureException(reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  Sentry.captureException(err);
  // Optionally: process.exit(1);
});

// --- Logging setup (winston) ---
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ]
});

// --- Sentry error tracking (optional) ---
Sentry.init({ dsn: process.env.SENTRY_DSN || '' });

// --- .env validation ---
await ensureEnvKeys();
dotenv.config();
const env = cleanEnv(process.env, {
  DISCORD_TOKEN: str(),
  CLIENT_ID: str(),
  GUILD_ID: str(),
  TWITCH_CLIENT_ID: str({ default: '' }),
  TWITCH_CLIENT_SECRET: str({ default: '' }),
  BLUESKY_USERNAME: str({ default: '' }),
  BLUESKY_PASSWORD: str({ default: '' }),
  COUNTER_SAVER_ENABLED: bool({ default: false }),
  COUNTER_SAVER_COOLDOWN_DAYS: num({ default: 0 }),
  TELEMETRY_ENABLED: bool({ default: true }),
  TELEMETRY_URL: str({ default: '' }),
  SENTRY_DSN: str({ default: '' })
});

// --- i18next language system ---
await i18next.use(Backend).init({
  lng: 'en',
  fallbackLng: 'en',
  backend: {
    loadPath: './locales/{{lng}}/translation.json'
  },
  interpolation: { escapeValue: false }
});
i18next.on('missingKey', (lngs, ns, key) => {
  logger.warn(`[i18next] Missing translation key: ${key} in ${lngs.join(', ')} [ns: ${ns}]`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

deployCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
client.commands = new Collection();

client.player = new Player(client, {
  leaveOnEmpty: true,
  leaveOnEnd: true,
  leaveOnStop: true,
});
await client.player.extractors.loadMulti(DefaultExtractors);

client.player.on('connectionCreate', (queue, connection) => {
  logger.info(`[Player] Connection created in queue for guild: ${queue.guild.id} Channel: ${connection.channel.id}`);
});
client.player.on('error', (queue, error) => {
  logger.error(`[Player] Error in queue for guild: ${queue.guild.id}`, error);
});

// --- Command loader ---
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = await import(`./src/commands/${file}`);
  const commandName = command.default.data ? command.default.data.name : command.default.name;
  client.commands.set(commandName, command.default);
}

// --- Command cooldowns (anti-spam, per-user, per-command) ---
const cooldowns = new Map();

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
  updateBotStatus();
  setInterval(updateBotStatus, 60000);

  // Start stream check interval.
  const guild = client.guilds.cache.get(env.GUILD_ID);
  // Use English as fallback for dialogues in stream check
  const t = i18next.getFixedT(getGuildLanguageFor(env.GUILD_ID));
  startStreamCheckInterval(guild, t);

  // Award voice XP every hour.
  setInterval(async () => {
    client.guilds.cache.forEach((guild) => {
      guild.channels.cache.filter((ch) => ch.isVoiceBased()).forEach((channel) => {
        channel.members.forEach(async (member) => {
          if (!member.user.bot) {
            const newLevel = await addVoiceXp(guild.id, member.id);
            if (newLevel) {
              const t = i18next.getFixedT(getGuildLanguageFor(guild.id));
              member.send(
                t('levelup', { level: newLevel })
              ).catch((err) => logger.error(`Could not DM ${member.user.tag}:`, err));
            }
          }
        });
      });
    });
  }, 3600000);

  // Send telemetry on startup and every 24h
  sendTelemetry(client);
  setInterval(() => sendTelemetry(client), 24 * 60 * 60 * 1000);
});

// --- Health check endpoint for containers ---
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }
}).listen(8080);

function updateBotStatus() {
  const ping = client.ws.ping;
  try {
    client.user.setPresence({
      activities: [{ name: `Ping: ${ping}ms`, type: ActivityType.Watching }],
      status: 'online',
    });
  } catch (error) {
    logger.error('Failed to update bot status:', error);
  }
}

// --- Database keepalive ---
setInterval(async () => {
  try {
    const db = await dbPromise;
    await db.get('SELECT 1');
  } catch (err) {
    logger.error('Database keepalive failed:', err);
  }
}, 60 * 60 * 1000);

// --- Command handler with input validation and cooldowns ---
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // --- Cooldown logic ---
    const cooldownAmount = command.cooldown || 3; // seconds, default 3s
    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Map());
    }
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const userId = interaction.user.id;
    if (timestamps.has(userId)) {
      const expiration = timestamps.get(userId) + cooldownAmount * 1000;
      if (now < expiration) {
        const timeLeft = ((expiration - now) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Please wait ${timeLeft}s before reusing \`/${command.name}\`.`, ephemeral: true });
      }
    }
    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount * 1000);

    // --- Language selection ---
    const lang = getGuildLanguageFor(interaction.guild?.id || 'default');
    const t = i18next.getFixedT(lang);

    try {
      logger.info(`Executing command: ${interaction.commandName} (lang: ${lang})`);

      // Example input validation for /play
      if (interaction.commandName === 'play') {
        const url = interaction.options.getString('url');
        if (!validator.isURL(url)) {
          return interaction.reply({ content: t('music.invalid_url', { url }), ephemeral: true });
        }
      }

      // Pass t as the translation function to commands
      await command.execute(interaction, t);
    } catch (error) {
      logger.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: t('general.error') || '❌ An unexpected error occurred. Please try again later.', ephemeral: true });
      }
      Sentry.captureException(error);
    }
  }
});

// --- Graceful shutdown for database ---
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  try {
    const db = await dbPromise;
    await db.close();
    logger.info('Database connection closed.');
  } catch (e) {
    logger.error('Error closing database:', e);
  }
  process.exit(0);
});

client.login(env.DISCORD_TOKEN);