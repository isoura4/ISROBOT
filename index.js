const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const config = require('./config.json');
const checkBlueskyPosts = require('./commands/checkBlueskyPosts');
const checkTwitchStreams = require('./commands/checkTwitchStreams');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildScheduledEvents // Ajouter cet intent pour les événements planifiés
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
const rest = new REST({ version: '10' }).setToken(config.token);

const registerCommands = async (guildId) => {
    try {
        console.log(`Enregistrement des commandes slash pour le serveur ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, guildId),
            { body: client.commands.map(command => command.data.toJSON()) }
        );
        console.log(`Commandes slash enregistrées avec succès pour le serveur ${guildId}.`);
    } catch (error) {
        console.error(`Erreur lors de l'enregistrement des commandes slash pour le serveur ${guildId}:`, error);
    }
};

const createServerConfig = (guildId) => {
    const serverConfigPath = path.join(__dirname, 'serverConfig.json');
    if (!fs.existsSync(serverConfigPath)) {
        const initialConfig = {
            servers: {
                [guildId]: {
                    blueskyChannelId: null,
                    mentionRoleId: null,
                    blueskyHandle: null,
                    twitchStreamers: [],
                    twitchAnnounceChannelId: null,
                    twitchMentionRoleId: null,
                    twitchOAuthToken: null,
                    announcedStreams: {} // Initialiser announcedStreams
                }
            }
        };
        fs.writeFileSync(serverConfigPath, JSON.stringify(initialConfig, null, 2));
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

const getTwitchOAuthToken = async (guildId) => {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    if (!serverConfig.servers[guildId].twitchOAuthToken) {
        try {
            const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${config.twitchClientId}&client_secret=${config.twitchClientSecret}&grant_type=client_credentials`, {
                method: 'POST'
            });
            const data = await response.json();
            serverConfig.servers[guildId].twitchOAuthToken = data.access_token;
            fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
            console.log(`Token OAuth obtenu avec succès pour le serveur ${guildId}.`);
        } catch (error) {
            console.error(`Erreur lors de l'obtention du token OAuth pour le serveur ${guildId}:`, error);
        }
    }
    return serverConfig.servers[guildId].twitchOAuthToken;
};

const reloadCommands = async () => {
    client.guilds.cache.forEach(guild => {
        registerCommands(guild.id);
    });
};

const ensureEventsFile = () => {
    const eventsPath = path.join(__dirname, 'events.json');
    if (!fs.existsSync(eventsPath)) {
        fs.writeFileSync(eventsPath, JSON.stringify({}, null, 2));
        console.log('Fichier events.json créé.');
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

    // Recharger les commandes toutes les 10 minutes
    setInterval(reloadCommands, 600000); // 600000 millisecondes = 10 minutes

    // Définir le statut du bot
    setInterval(async () => {
        const start = Date.now();
        await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bot ${config.token}`
            }
        });
        const end = Date.now();
        const responseTime = end - start;

        client.user.setPresence({
            activities: [{
                name: `Ping: ${responseTime} ms`,
                type: ActivityType.Watching
            }],
            status: 'online'
        });
    }, 60000); // 60000 millisecondes = 1 minute

    // Vérifier les rappels et supprimer les événements terminés toutes les minutes
    setInterval(async () => {
        ensureEventsFile();
        const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'events.json'), 'utf8'));
        const now = new Date();

        for (const eventId in events) {
            const event = events[eventId];
            const eventEndDate = new Date(`${event.date}T${event.endTime}:00`);
            const timeDiff = eventEndDate - now;

            // Vérifier les rappels
            event.reminders.forEach(reminder => {
                if (timeDiff === reminder.time * 60 * 1000) {
                    const channel = client.channels.cache.get(event.channelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle(`Rappel pour l'événement "${event.title}"`)
                            .setDescription(`L'événement "${event.title}" commence dans ${reminder.time} minutes.`)
                            .setColor(0x00ff00)
                            .setTimestamp(new Date().toISOString())
                            .setFooter({ text: '© 2023 Votre Bot Discord' });

                        const userIds = reminder.userIds.map(id => `<@${id}>`).join(' ');
                        const roleIds = reminder.roleIds.map(id => `<@&${id}>`).join(' ');
                        const content = `${userIds} ${roleIds}`;

                        channel.send({ content, embeds: [embed] });
                    }
                }
            });

            // Supprimer les événements terminés
            if (timeDiff <= 0) {
                const channel = client.channels.cache.get(event.channelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Fin de l'événement "${event.title}"`)
                        .setDescription(`L'événement "${event.title}" est maintenant terminé.`)
                        .setColor(0xff0000)
                        .setTimestamp(new Date().toISOString())
                        .setFooter({ text: '© 2023 Votre Bot Discord' });

                    channel.send({ embeds: [embed] });
                }
                delete events[eventId];
                fs.writeFileSync(path.join(__dirname, 'events.json'), JSON.stringify(events, null, 2));
            }
        }
    }, 60000); // 60000 millisecondes = 1 minute
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

client.login(config.token);

// Gérer le flux OAuth
app.get('/auth/twitch', (req, res) => {
    const redirectUri = `https://id.twitch.tv/oauth2/authorize?client_id=${config.twitchClientId}&redirect_uri=${encodeURIComponent('http://localhost:3000/callback')}&response_type=code&scope=user:read:follows`;
    res.redirect(redirectUri);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const guildId = req.query.state; // Assurez-vous de passer l'ID du serveur dans l'URL de redirection
    try {
        const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${config.twitchClientId}&client_secret=${config.twitchClientSecret}&code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent('http://localhost:3000/callback')}`, {
            method: 'POST'
        });
        const data = await response.json();
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        serverConfig.servers[guildId].twitchOAuthToken = data.access_token;
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
        res.send('Token OAuth obtenu avec succès.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de l\'obtention du token OAuth.');
    }
});

app.listen(3000, () => {
    console.log('Serveur OAuth en écoute sur le port 3000');
});
