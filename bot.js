const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path'); // Import the path module
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Load command files
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./src/commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updateBotStatus();
    setInterval(updateBotStatus, 60000); // Update status every minute
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const gameState = loadGameState();

    if (message.channel.id !== gameState.gameChannelId) {
        return;
    }

    const number = parseInt(message.content, 10);
    if (isNaN(number)) {
        return;
    }

    if (message.author.id === gameState.lastUser) {
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        saveGameState(gameState);
        await message.reply('You cannot answer twice in a row! The counter resumes from 0.');
        await message.react('❌'); // Incorrect reaction
        return;
    }

    if (number === gameState.currentNumber + 1) {
        gameState.currentNumber = number;
        gameState.lastUser = message.author.id;
        saveGameState(gameState);
        await message.react('✅'); // Correct reaction
    } else {
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        saveGameState(gameState);
        await message.reply('Wrong number! We start again from 0.');
        await message.react('❌'); // Incorrect reaction
    }
});

client.login(process.env.DISCORD_TOKEN);

function updateBotStatus() {
    const ping = client.ws.ping;
    client.user.setActivity(`Ping: ${ping}ms`, { type: 'WATCHING' });
}

function loadGameState() {
    const stateFilePath = path.join(__dirname, 'src/commands/count-state.json');
    if (fs.existsSync(stateFilePath)) {
        const data = fs.readFileSync(stateFilePath, 'utf8');
        return JSON.parse(data);
    }
    return {
        currentNumber: 0,
        lastUser: null,
        gameChannelId: null
    };
}

function saveGameState(gameState) {
    const stateFilePath = path.join(__dirname, 'src/commands/count-state.json');
    fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
}