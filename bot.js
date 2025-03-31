import { Client, GatewayIntentBits, Collection, ActivityType, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { deployCommands } from './deploy-commands.js';
import { startStreamCheckInterval } from './src/commands/stream.js';
import { getLanguageState } from './src/commands/language.js';
import { addMessageXp, addVoiceXp } from './src/levels.js';

dotenv.config();

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

  // Button interaction handling
  if (interaction.isButton()) {
    const db = await import('./src/database.js').then((module) => module.default);
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    let userData = await db.get('SELECT * FROM users WHERE guildId = ? AND userId = ?', guildId, userId);
    if (!userData) {
      await db.run('INSERT INTO users (guildId, userId) VALUES (?, ?)', guildId, userId);
      userData = await db.get('SELECT * FROM users WHERE guildId = ? AND userId = ?', guildId, userId);
    }
    const customId = interaction.customId;
    if (customId === 'store_buy_counter_saver') {
      // If store (counter saver) is deactivated, stop.
      if (process.env.COUNTER_SAVER_ENABLED?.toLowerCase() !== 'true') {
        return await interaction.reply({ content: dialogues.store.disabled, flags: 64 });
      }
      try {
        const stateFilePath = path.join(__dirname, 'src', 'commands', 'count-state.json');
        let gameState = {
          currentNumber: 0,
          lastUser: null,
          gameChannelId: null,
          counterBroken: false,
          savedValue: 0,
          lastCounterSaveTimestamp: 0
        };
        if (fs.existsSync(stateFilePath)) {
          try {
            const stateContent = fs.readFileSync(stateFilePath, 'utf8');
            gameState = JSON.parse(stateContent);
          } catch (e) {
            console.error('[ERROR] Failed to parse state file:', e);
            return await interaction.reply({ content: dialogues.store.state_file_corrupt, flags: 64 });
          }
        }
        const now = Date.now();
        const cooldownDays = Number(process.env.COUNTER_SAVER_COOLDOWN_DAYS) || 0;
        const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
        if (gameState.lastCounterSaveTimestamp && (now - gameState.lastCounterSaveTimestamp) < cooldownMs) {
          const remainingTime = cooldownMs - (now - gameState.lastCounterSaveTimestamp);
          const cooldownMsg = dialogues.store.counter_cooldown
            ? dialogues.store.counter_cooldown.replace('{remaining}', Math.ceil(remainingTime / (24 * 60 * 60 * 1000)))
            : 'Counter Saver is on cooldown. Please try again later.';
          return await interaction.reply({ content: cooldownMsg, flags: 64 });
        }
        if (!gameState.counterBroken) {
          return await interaction.reply({ content: dialogues.store.counter_not_available, flags: 64 });
        }
        const counterItem = await db.get('SELECT * FROM store_items WHERE item_key = ?', 'counter_saver');
        if (!counterItem) {
          console.error('[ERROR] Counter Saver item not found in database.');
          return await interaction.reply({ content: dialogues.store.item_not_found, flags: 64 });
        }
        if (userData.coins < counterItem.price) {
          return await interaction.reply({ content: dialogues.store.no_funds, flags: 64 });
        }
        // Deduct coins.
        await db.run('UPDATE users SET coins = coins - ? WHERE guildId = ? AND userId = ?', counterItem.price, guildId, userId);
        // Resume counter and set cooldown timestamp.
        gameState.currentNumber = gameState.savedValue;
        gameState.counterBroken = false;
        gameState.savedValue = 0;
        gameState.lastCounterSaveTimestamp = now;
        try {
          fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
        } catch (writeErr) {
          console.error('[ERROR] Failed to write updated state file:', writeErr);
          return await interaction.reply({ content: dialogues.store.state_update_error, flags: 64 });
        }
        await interaction.reply({ content: dialogues.store.counter_success, flags: 64 });
        const countingChannelId = gameState.gameChannelId || process.env.COUNTING_CHANNEL_ID;
        if (countingChannelId) {
          const countingChannel = client.channels.cache.get(countingChannelId);
          if (countingChannel) {
            await countingChannel.send(dialogues.store.counter_public);
          } else {
            console.error(`[ERROR] Counting mini-game channel (${countingChannelId}) not found.`);
          }
        }
      } catch (error) {
        console.error('[ERROR] Error processing counter saver purchase:', error);
        return await interaction.reply({ content: dialogues.store.purchase_error, flags: 64 });
      }
    }
    // (Other button interactions can be handled here.)
  }
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
    // --- Store-Activated Mode ---
    // Special branch: if counter is reset (currentNumber===0) and user enters 1, resume immediately.
    if (gameState.currentNumber === 0 && number === 1) {
      gameState.currentNumber = 1;
      gameState.lastUser = message.author.id;
      gameState.counterBroken = false;
      gameState.savedValue = 0;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      await message.react('✅');
      return;
    }
    // Check for consecutive entries.
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
    // Correct consecutive entry.
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
      // For a nonconsecutive wrong number.
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
        // If already broken and wrong input again, simply reset without sending an extra message.
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        gameState.counterBroken = false;
        gameState.savedValue = 0;
        fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      }
    }
  } else {
    // --- Store-Disabled Mode ---
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