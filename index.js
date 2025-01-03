const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const { getCounter, setCounter } = require('./utils/counter');
const checkBlueskyPosts = require('./commands/checkBlueskyPosts');
const checkTwitchStreams = require('./commands/checkTwitchStreams');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers
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
let config;
try {
    config = require('./config.json');
} catch (error) {
    console.error('Erreur lors du chargement de config.json:', error);
    process.exit(1);
}

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

const createOrUpdateServerConfig = (guildId) => {
    const serverConfigPath = path.join(__dirname, 'serverConfig.json');
    let serverConfig = {};

    if (fs.existsSync(serverConfigPath)) {
        serverConfig = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));
    }

    if (!serverConfig.servers) {
        serverConfig.servers = {};
    }

    if (!serverConfig.servers[guildId]) {
        serverConfig.servers[guildId] = {
            blueskyChannelId: null,
            mentionRoleId: null,
            blueskyHandle: null,
            twitchStreamers: [],
            twitchAnnounceChannelId: null,
            twitchMentionRoleId: null,
            twitchOAuthToken: null,
            announcedStreams: {}
        };
        fs.writeFileSync(serverConfigPath, JSON.stringify(serverConfig, null, 2));
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

const ensureConfigFile = () => {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        const initialConfig = {
            token: config.token || 'your_discord_bot_token',
            clientId: config.clientId || 'your_discord_client_id',
            blueskyHandle: config.blueskyHandle || 'your_bluesky_handle',
            blueskyAppPassword: config.blueskyAppPassword || 'your_bluesky_app_password',
            twitchClientId: config.twitchClientId || 'your_twitch_client_id',
            twitchClientSecret: config.twitchClientSecret || 'your_twitch_client_secret'
        };
        fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
        console.log('Fichier config.json créé.');
    }
};

ensureConfigFile();

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    client.guilds.cache.forEach(guild => {
        createOrUpdateServerConfig(guild.id);
        registerCommands(guild.id);
    });

    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            checkBlueskyPosts(client, guild.id);
            checkTwitchStreams(client, guild.id);
        });
    }, 300000);

    setInterval(reloadCommands, 600000);

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
    }, 60000);

    setInterval(async () => {
        ensureEventsFile();
        const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'events.json'), 'utf8'));
        const now = new Date();

        for (const eventId in events) {
            const event = events[eventId];
            const eventEndDate = new Date(`${event.date}T${event.endTime}:00`);
            const timeDiff = eventEndDate - now;

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
    }, 60000);
});

client.on('guildCreate', async guild => {
    createOrUpdateServerConfig(guild.id);
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

const messageCache = new Map();

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const guildId = message.guild.id;
    const { count, lastUser, channelId } = getCounter(guildId);
    const expectedNumber = count + 1;

    if (message.channel.id !== channelId) return;

    if (messageCache.has(message.id)) return;

    messageCache.set(message.id, true);

    if (message.content === expectedNumber.toString()) {
        if (lastUser === message.author.id) {
            setCounter(guildId, 0, null, channelId);
            await message.react('❌');
            await message.reply('Une même personne ne peut pas répondre deux fois. On recommence de zéro !');
        } else {
            setCounter(guildId, expectedNumber, message.author.id, channelId);
            await message.react('✅');
        }
        messageCache.delete(message.id);
    } else {
        setCounter(guildId, 0, null, channelId);
        await message.react('❌');
        await message.reply('Tu t\'es trompé ! Le compteur reprend à zéro ! Recommençons.');
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.author.bot) return;

    const guildId = newMessage.guild.id;
    const { count, lastUser, channelId } = getCounter(guildId);
    const expectedNumber = count + 1;

    if (newMessage.channel.id !== channelId) return;

    if (messageCache.has(newMessage.id)) return;

    messageCache.set(newMessage.id, true);

    if (newMessage.content === expectedNumber.toString()) {
        if (lastUser === newMessage.author.id) {
            setCounter(guildId, 0, null, channelId);
            await newMessage.react('❌');
            await newMessage.reply('Une même personne ne peut pas répondre deux fois. On recommence de zéro !');
        } else {
            setCounter(guildId, expectedNumber, newMessage.author.id, channelId);
            await newMessage.react('✅');
        }
        messageCache.delete(newMessage.id);
    } else {
        setCounter(guildId, 0, null, channelId);
        await newMessage.react('❌');
        await newMessage.reply('Tu t\'es trompé ! Le compteur reprend à zéro ! Recommençons.');
    }
});

client.login(config.token);

app.get('/auth/twitch', (req, res) => {
    const redirectUri = `https://id.twitch.tv/oauth2/authorize?client_id=${config.twitchClientId}&redirect_uri=${encodeURIComponent('http://localhost:3000/callback')}&response_type=code&scope=user:read:follows`;
    res.redirect(redirectUri);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const guildId = req.query.state;
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
