const fs = require('fs');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const checkBlueskyPosts = require('./commands/checkBlueskyPosts');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// Charger les commandes
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
    }
}

// Enregistrer les commandes slash
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Début de l\'enregistrement des commandes slash...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: client.commands.map(command => command.data.toJSON()) }
        );

        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    // Vérifier les nouveaux posts de Bluesky toutes les 5 minutes
    setInterval(() => {
        checkBlueskyPosts(client);
    }, 300000); // 300000 millisecondes = 5 minutes
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Il y a eu une erreur en essayant d\'exécuter cette commande.', ephemeral: true });
    }
});

client.login(token);
