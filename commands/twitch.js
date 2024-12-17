const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const getTwitchOAuthToken = require('../utils/getTwitchOAuthToken');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Afficher les informations du stream actuel d\'un streamer Twitch.')
        .addStringOption(option =>
            option.setName('streamer')
                .setDescription('Le nom du streamer Twitch.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const streamer = interaction.options.getString('streamer');
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        const twitchStreamers = serverConfig.servers[interaction.guildId]?.twitchStreamers || [];
        const twitchOAuthToken = await getTwitchOAuthToken(interaction.guildId);

        if (!twitchStreamers.includes(streamer)) {
            return interaction.reply(`Vous ne suivez pas le streamer Twitch ${streamer}.`);
        }

        if (!twitchOAuthToken) {
            return interaction.reply('Le token OAuth Twitch n\'a pas été configuré pour ce serveur. Veuillez suivre les instructions pour obtenir le token OAuth.');
        }

        try {
            const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamer}`, {
                headers: {
                    'Client-ID': config.twitchClientId,
                    'Authorization': `Bearer ${twitchOAuthToken}`
                }
            });
            const data = await response.json();

            console.log('API Response:', data); // Ajouter un log pour vérifier la réponse de l'API

            if (!data.data || data.data.length === 0) {
                return interaction.reply(`Le streamer ${streamer} n'est pas en ligne ou n'existe pas.`);
            }

            const stream = data.data[0];
            const embed = new EmbedBuilder()
                .setTitle(`${stream.user_name} est en ligne !`)
                .setURL(`https://twitch.tv/${stream.user_name}`)
                .setDescription(stream.title)
                .setThumbnail(`https://static-cdn.jtvnw.net/jtv_user_pictures/${stream.user_login}-profile_image-300x300.png`)
                .addFields(
                    { name: 'Jeu', value: stream.game_name, inline: true },
                    { name: 'Spectateurs', value: stream.viewer_count.toString(), inline: true }
                )
                .setImage(stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080'))
                .setColor('#6441A5');

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply('Désolé, je n\'ai pas pu récupérer les informations du stream Twitch.');
        }
    }
};
