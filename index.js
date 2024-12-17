const fs = require('fs');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { token, clientId } = require('./config.json');
const checkBlueskyPosts = require('./commands/checkBlueskyPosts');
const checkTwitchStreams = require('./commands/checkTwitchStreams');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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

// Enregistrer les commandes slash pour chaque serveur
const rest = new REST({ version: '10' }).setToken(token);

const registerCommands = async (guildId) => {
    try {
        console.log(`Enregistrement des commandes slash pour le serveur ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: client.commands.map(command => command.data.toJSON()) }
        );
        console.log(`Commandes slash enregistrées avec succès pour le serveur ${guildId}.`);
    } catch (error) {
        console.error(`Erreur lors de l'enregistrement des commandes slash pour le serveur ${guildId}:`, error);
    }
};

const createServerConfig = (guildId) => {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    if (!serverConfig.servers[guildId]) {
        serverConfig.servers[guildId] = {
            blueskyChannelId: null,
            mentionRoleId: null,
            blueskyHandle: null,
            twitchStreamers: [],
            twitchAnnounceChannelId: null,
            twitchMentionRoleId: null
        };
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
        console.log(`Configuration initiale créée pour le serveur ${guildId}.`);
    }
};

const deleteServerConfig = (guildId) => {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    if (serverConfig.servers[guildId]) {
        delete serverConfig.servers[guildId];
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
        console.log(`Configuration supprimée pour le serveur ${guildId}.`);
    }
};

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    // Créer les configurations initiales pour tous les serveurs où le bot est présent
    client.guilds.cache.forEach(guild => {
        createServerConfig(guild.id);
        registerCommands(guild.id);
    });

    // Vérifier les nouveaux posts de Bluesky toutes les 5 minutes
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            checkBlueskyPosts(client, guild.id);
            checkTwitchStreams(client, guild.id);
        });
    }, 300000); // 300000 millisecondes = 5 minutes
});

client.on('guildCreate', async guild => {
    createServerConfig(guild.id);
    await registerCommands(guild.id);
    console.log(`Le bot a rejoint un nouveau serveur : ${guild.name} (${guild.id})`);
});

client.on('guildDelete', guild => {
    deleteServerConfig(guild.id);
    console.log(`Le bot a été expulsé du serveur : ${guild.name} (${guild.id})`);
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
