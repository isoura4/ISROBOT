import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { deployCommands } from './deploy-commands.js';
import streamCommand, { startStreamCheckInterval } from './src/commands/stream.js';
import { getLanguageState } from './src/commands/language.js';
import { addMessageXp } from './src/levels.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deploy commands before client login
deployCommands();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildPresences
    ] 
});
client.commands = new Collection();

// Load language state from file (from /src/commands/language-state.json)
const languageStateFilePath = path.join(__dirname, 'src/commands/language-state.json');
let languageState = { language: 'en' };
if (fs.existsSync(languageStateFilePath)) {
    const data = fs.readFileSync(languageStateFilePath, 'utf8');
    languageState = JSON.parse(data);
    console.log(`Loaded language state: ${languageState.language}`);
} else {
    console.log('Language state file not found, defaulting to English.');
}

// Load dialogues from the locales folder instead of a single file
const localesFolderPath = path.join(__dirname, 'locales');
function loadDialogues(language) {
    const filePath = path.join(localesFolderPath, `${language}.json`);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.error(`Error reading locale file for ${language}:`, err);
        }
    } else {
        console.warn(`Locale file for ${language} not found. Falling back to English.`);
        const fallbackPath = path.join(localesFolderPath, 'en.json');
        return fs.existsSync(fallbackPath) ? JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) : {};
    }
}
let dialogues = loadDialogues(languageState.language);

// Load command files
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = await import(`./src/commands/${file}`);
    client.commands.set(command.default.name, command.default);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updateBotStatus();
    setInterval(updateBotStatus, 60000); // Update status every minute

    // Start the stream check interval using the current locale dialogues
    startStreamCheckInterval(client.guilds.cache.get(process.env.GUILD_ID), dialogues);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        console.log(`Executing command: ${interaction.commandName} with language: ${languageState.language}`);
        await command.execute(interaction, dialogues);
        // If the language command was executed, reload the state and dialogues
        if (interaction.commandName === 'language') {
            languageState = getLanguageState();
            dialogues = loadDialogues(languageState.language);
            console.log(`Language changed to: ${languageState.language}`);
        }
    } catch (error) {
        console.error(error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Increase XP for every message from a non-bot user
    addMessageXp(message.guild.id, message.author.id);

    // Process counting game if the message is sent in the designated channel
    const gameState = loadGameState();
    if (message.channel.id !== gameState.gameChannelId) return;

    const number = parseInt(message.content, 10);
    if (isNaN(number)) return;

    if (message.author.id === gameState.lastUser) {
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        saveGameState(gameState);
        await message.reply(dialogues.count.error_twice);
        await message.react('❌');
        return;
    }

    if (number === gameState.currentNumber + 1) {
        gameState.currentNumber = number;
        gameState.lastUser = message.author.id;
        saveGameState(gameState);
        await message.react('✅');
    } else {
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        saveGameState(gameState);
        await message.reply(dialogues.count.error_wrong);
        await message.react('❌');
    }
});

client.login(process.env.DISCORD_TOKEN);

function updateBotStatus() {
    const ping = client.ws.ping;
    console.log(`Updating bot status with ping: ${ping}ms`);
    try {
        client.user.setPresence({
            activities: [{ name: `Ping: ${ping}ms`, type: ActivityType.Watching }],
            status: 'online'
        });
        console.log('Bot status updated successfully');
    } catch (error) {
        console.error('Failed to update bot status:', error);
    }
}

function loadGameState() {
    const stateFilePath = path.join(__dirname, 'src/commands/count-state.json');
    if (fs.existsSync(stateFilePath)) {
        return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
    return { currentNumber: 0, lastUser: null, gameChannelId: null };
}

function saveGameState(gameState) {
    const stateFilePath = path.join(__dirname, 'src/commands/count-state.json');
    fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
}