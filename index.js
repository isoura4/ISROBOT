const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

// Lire le fichier de configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', message => {
    if (message.content === '!ping') {
        message.channel.send('Pong!');
    } else if (message.content === '!hello') {
        message.channel.send('Hello!');
    }
});

client.login(config.token);
