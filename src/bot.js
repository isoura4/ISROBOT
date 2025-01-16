const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
client.commands = new Collection();

// Load command files
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', message => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

client.login(process.env.DISCORD_TOKEN);