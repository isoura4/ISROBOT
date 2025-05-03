import { ensureEnvKeys } from './src/ensureEnvKeys.js';
await ensureEnvKeys(); // Ensure .env exists and is filled

import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.trim() === '') {
  console.error("Error: DISCORD_TOKEN is missing. Please update your .env file with your Discord bot token.");
  process.exit(1);
}

import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deployCommands } from './deploy-commands.js';
import { startStreamCheckInterval } from './src/commands/stream.js';
import { getLanguageState } from './src/commands/language.js';
import { addMessageXp, addVoiceXp } from './src/levels.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor'; 
import { sendTelemetry } from './src/telemetry.js';

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
  console.log('[Player] Connection created in queue for guild:', queue.guild.id, 'Channel:', connection.channel.id);
});
client.player.on('error', (queue, error) => {
  console.error('[Player] Error in queue for guild:', queue.guild.id, error);
});

// Load language state from file
const languageStateFilePath = path.join(__dirname, 'src', 'commands', 'language-state.json');
let languageState = { language: 'en' };
if (fs.existsSync(languageStateFilePath)) {
  try {
    const data = fs.readFileSync(languageStateFilePath, 'utf8');
    languageState = JSON.parse(data);
    console.log(`Loaded language state: ${languageState.language}`);
  } catch (err) {
    console.error("Error reading language state:", err);
  }
} else {
  console.log('Language state file not found, defaulting to English.');
}

// Load locale dialogues based on language state
const localesFolderPath = path.join(__dirname, 'locales');
function loadDialogues(language) {
  const filePath = path.join(localesFolderPath, `${language}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`Error reading locale file for ${language}:`, err);
      return {};
    }
  } else {
    console.warn(`Locale file for ${language} not found. Falling back to English.`);
    const fallbackPath = path.join(localesFolderPath, 'en.json');
    return fs.existsSync(fallbackPath) ? JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) : {};
  }
}
let dialogues = loadDialogues(languageState.language);

// Load command files from /src/commands
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = await import(`./src/commands/${file}`);
  const commandName = command.default.data ? command.default.data.name : command.default.name;
  client.commands.set(commandName, command.default);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  updateBotStatus();
  setInterval(updateBotStatus, 60000);

  // Start stream check interval.
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  startStreamCheckInterval(guild, dialogues);

  // Award voice XP every hour.
  setInterval(async () => {
    client.guilds.cache.forEach((guild) => {
      guild.channels.cache.filter((ch) => ch.isVoiceBased()).forEach((channel) => {
        channel.members.forEach(async (member) => {
          if (!member.user.bot) {
            const newLevel = await addVoiceXp(guild.id, member.id);
            if (newLevel) {
              member.send(
                dialogues.levelup
                  ? dialogues.levelup.replace('{level}', newLevel)
                  : `You've reached level ${newLevel}!`
              ).catch((err) => console.error(`Could not DM ${member.user.tag}:`, err));
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

function updateBotStatus() {
  const ping = client.ws.ping;
  try {
    client.user.setPresence({
      activities: [{ name: `Ping: ${ping}ms`, type: ActivityType.Watching }],
      status: 'online',
    });
  } catch (error) {
    console.error('Failed to update bot status:', error);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      console.log(`Executing command: ${interaction.commandName} (lang: ${languageState.language})`);
      await command.execute(interaction, dialogues);
      if (interaction.commandName === 'language') {
        languageState = getLanguageState();
        dialogues = loadDialogues(languageState.language);
        console.log(`Language changed to: ${languageState.language}`);
      }
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error executing that command.', flags: 64 });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);