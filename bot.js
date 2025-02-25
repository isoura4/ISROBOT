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
  setInterval(updateBotStatus, 60000); // Update every minute

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

// Handle interactions (slash commands and button interactions)
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
    // Import the database instance.
    const db = await import('./src/database.js').then((module) => module.default);
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    // Retrieve or create user data.
    let userData = await db.get('SELECT * FROM users WHERE guildId = ? AND userId = ?', guildId, userId);
    if (!userData) {
      await db.run('INSERT INTO users (guildId, userId) VALUES (?, ?)', guildId, userId);
      userData = await db.get('SELECT * FROM users WHERE guildId = ? AND userId = ?', guildId, userId);
    }
    const customId = interaction.customId;

    // Handle Counter Saver purchase button (customId: 'store_buy_counter_saver')
    if (customId === 'store_buy_counter_saver') {
      try {
        const stateFilePath = path.join(__dirname, 'src', 'commands', 'count-state.json');
        let gameState = {
          currentNumber: 0,
          lastUser: null,
          gameChannelId: null,
          counterBroken: false,
          savedValue: 0,
        };
        if (fs.existsSync(stateFilePath)) {
          try {
            const stateContent = fs.readFileSync(stateFilePath, 'utf8');
            gameState = JSON.parse(stateContent);
          } catch (e) {
            console.error('[ERROR] Failed to parse state file:', e);
            return await interaction.reply({ content: 'State file is corrupted.', flags: 64 });
          }
        }
    
        if (!gameState.counterBroken) {
          const replyText =
            dialogues.store && dialogues.store.counter_not_available
              ? dialogues.store.counter_not_available
              : 'Counter not available for resuming.';
          return await interaction.reply({ content: replyText, flags: 64 });
        }
    
        const counterItem = await db.get('SELECT * FROM store_items WHERE item_key = ?', 'counter_saver');
        if (!counterItem) {
          console.error('[ERROR] Counter saver item not found in database.');
          return await interaction.reply({ content: 'Internal error: item not found.', flags: 64 });
        }
    
        if (userData.coins < counterItem.price) {
          const replyText =
            dialogues.store && dialogues.store.no_funds ? dialogues.store.no_funds : 'Not enough coins.';
          return await interaction.reply({ content: replyText, flags: 64 });
        }
    
        // Deduct coins.
        await db.run('UPDATE users SET coins = coins - ? WHERE guildId = ? AND userId = ?', counterItem.price, guildId, userId);
    
        // Update game state: resume counter.
        gameState.currentNumber = gameState.savedValue;
        gameState.counterBroken = false;
        gameState.savedValue = 0;
        try {
          fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
        } catch (writeErr) {
          console.error('[ERROR] Failed to write updated state file:', writeErr);
          return await interaction.reply({ content: 'Internal error updating state.', flags: 64 });
        }
    
        const replyText =
          dialogues.store && dialogues.store.counter_success ? dialogues.store.counter_success : 'Counter resumed!';
        await interaction.reply({ content: replyText, flags: 64 });
    
        // Send public announcement in the counting mini-game channel.
        const countingChannelId = gameState.gameChannelId || process.env.COUNTING_CHANNEL_ID;
        if (countingChannelId) {
          const countingChannel = client.channels.cache.get(countingChannelId);
          if (countingChannel) {
            const publicMessage = dialogues.store && dialogues.store.counter_public 
              ? dialogues.store.counter_public 
              : "Your counter has been taken back! thanks to a purchase!";
            await countingChannel.send(publicMessage);
          } else {
            console.error(`[ERROR] Counting mini-game channel (${countingChannelId}) not found.`);
          }
        }
    
      } catch (error) {
        console.error('[ERROR] Error processing counter saver purchase:', error);
        return await interaction.reply({ content: 'An unexpected error occurred during your purchase.', flags: 64 });
      }
    }
    // (Other button interactions can be handled here.)
  }
});

// Handle message events (XP and counting game logic)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Award XP for the message.
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
  
  // Counting game logic.
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
  
  // Check if the same user posted consecutively.
  if (message.author.id === gameState.lastUser) {
    if (!gameState.counterBroken) {
      gameState.counterBroken = true;
      gameState.savedValue = gameState.currentNumber;
      gameState.lastUser = null;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      const errorBroken =
        dialogues.count && dialogues.count.error_broken
          ? dialogues.count.error_broken.replace('{number}', gameState.savedValue)
          : `Error! Saved value: ${gameState.savedValue}`;
      await message.reply(errorBroken);
      await message.react('❌');
    } else {
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      gameState.counterBroken = false;
      gameState.savedValue = 0;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      const errorTwice =
        dialogues.count && dialogues.count.error_twice ? dialogues.count.error_twice : 'Consecutive entries! Count reset.';
      await message.reply(errorTwice);
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
      const errorBroken =
        dialogues.count && dialogues.count.error_broken
          ? dialogues.count.error_broken.replace('{number}', gameState.savedValue)
          : `Error! Saved value: ${gameState.savedValue}`;
      await message.reply(errorBroken);
      await message.react('❌');
    } else {
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      gameState.counterBroken = false;
      gameState.savedValue = 0;
      fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
      const errorWrong =
        dialogues.count && dialogues.count.error_wrong ? dialogues.count.error_wrong : 'Wrong number! Count reset.';
      await message.reply(errorWrong);
      await message.react('❌');
    }
  }
});

// Helper: Update bot status.
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