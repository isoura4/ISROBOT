import { ensureEnvKeys } from './src/ensureEnvKeys.js';
await ensureEnvKeys(); // Wait for .env creation and interactive input

import dotenv from 'dotenv';
dotenv.config();

// Optionally, check that the DISCORD_TOKEN is now set
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

// Setup __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deploy slash commands
deployCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});
client.commands = new Collection();

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
  client.commands.set(command.default.name, command.default);
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
});

client.on('interactionCreate', async (interaction) => {
  // Slash command handling
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

  // Button interaction handling (code omitted for brevity)
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Award message XP.
  const newLevel = await addMessageXp(message.guild.id, message.author.id, message.content);
  if (newLevel) {
    try {
      const levelupText = dialogues.levelup 
        ? dialogues.levelup.replace('{level}', newLevel)
        : `You've reached level ${newLevel}!`;
      await message.author.send(levelupText);
    } catch (err) {
      console.error('Unable to send DM:', err);
    }
  }

  const statePath = path.join(__dirname, 'src', 'commands', 'count-state.json');
  let gameState = {
    currentNumber: 0,
    lastUser: null,
    gameChannelId: null,
    counterBroken: false,
    savedValue: 0,
  };
  if (fs.existsSync(statePath)) {
    try {
      gameState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {
      console.error('Error parsing count state file:', e);
    }
  }
  if (message.channel.id !== gameState.gameChannelId) return;
  const number = parseInt(message.content, 10);
  if (isNaN(number)) return;
  const useCounterSaver = process.env.COUNTER_SAVER_ENABLED?.toLowerCase() === 'true';

  if (useCounterSaver) {
    if (gameState.currentNumber === 0 && number === 1) {
      gameState.currentNumber = 1;
      gameState.lastUser = message.author.id;
      gameState.counterBroken = false;
      gameState.savedValue = 0;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      await message.react('✅');
      return;
    }
    if (message.author.id === gameState.lastUser) {
      if (!gameState.counterBroken) {
        gameState.counterBroken = true;
        gameState.savedValue = gameState.currentNumber;
        gameState.lastUser = null;
        fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
        const errorMsg = (dialogues.count && dialogues.count.error_combined)
          ? dialogues.count.error_combined.replace('{number}', gameState.savedValue)
          : `Incorrect number! Your counter has been saved at ${gameState.savedValue}. You can save it using an item from the store or start from zero. Good luck!`;
        await message.reply(errorMsg);
        await message.react('❌');
      }
      return;
    }
    if (number === gameState.currentNumber + 1) {
      if (gameState.counterBroken) {
        gameState.counterBroken = false;
        gameState.savedValue = 0;
      }
      gameState.currentNumber = number;
      gameState.lastUser = message.author.id;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      await message.react('✅');
    } else {
      if (!gameState.counterBroken) {
        gameState.counterBroken = true;
        gameState.savedValue = gameState.currentNumber;
        gameState.lastUser = null;
        fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
        const errorMsg = (dialogues.count && dialogues.count.error_broken)
          ? dialogues.count.error_broken.replace('{number}', gameState.savedValue)
          : `Incorrect number! Your counter has been saved at ${gameState.savedValue}. You can save it using an item from the store or start from zero. Good luck!`;
        await message.reply(errorMsg);
        await message.react('❌');
      } else {
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        gameState.counterBroken = false;
        gameState.savedValue = 0;
        fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      }
    }
  } else {
    if (message.author.id === gameState.lastUser) {
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      const errorMsg = (dialogues.count && dialogues.count.error_twice)
        ? dialogues.count.error_twice
        : 'You have sent twice in a row! The counter has been reset.';
      await message.reply(errorMsg);
      await message.react('❌');
      return;
    }
    if (number === gameState.currentNumber + 1) {
      gameState.currentNumber = number;
      gameState.lastUser = message.author.id;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      await message.react('✅');
      return;
    } else {
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      const errorMsg = (dialogues.count && dialogues.count.error_wrong)
        ? dialogues.count.error_wrong
        : 'Wrong number! The counter has been reset.';
      await message.reply(errorMsg);
      await message.react('❌');
      return;
    }
  }
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

client.login(process.env.DISCORD_TOKEN);