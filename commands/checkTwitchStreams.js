const fetch = require('node-fetch');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const getTwitchOAuthToken = require('../utils/getTwitchOAuthToken');
const config = require('../config.json');

async function checkTwitchStreams(client, guildId) {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    const twitchStreamers = serverConfig.servers[guildId]?.twitchStreamers || [];
    const twitchAnnounceChannelId = serverConfig.servers[guildId]?.twitchAnnounceChannelId;
    const twitchMentionRoleId = serverConfig.servers[guildId]?.twitchMentionRoleId;
    const channel = client.channels.cache.get(twitchAnnounceChannelId);

    if (!channel) {
        console.error(`Le salon pour les annonces Twitch n'a pas été défini pour le serveur ${guildId}.`);
        return;
    }

    for (const streamer of twitchStreamers) {
        try {
            const twitchOAuthToken = await getTwitchOAuthToken(guildId);
            const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamer}`, {
                headers: {
                    'Client-ID': config.twitchClientId,
                    'Authorization': `Bearer ${twitchOAuthToken}`
                }
            });
            const data = await response.json();

            if (data.data.length > 0) {
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

                const role = channel.guild.roles.cache.get(twitchMentionRoleId);
                if (role) {
                    channel.send({ content: `<@&${twitchMentionRoleId}> Nouveau stream Twitch !`, embeds: [embed] });
                } else {
                    channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération des informations du stream Twitch pour ${streamer}:`, error);
        }
    }
}

module.exports = checkTwitchStreams;
