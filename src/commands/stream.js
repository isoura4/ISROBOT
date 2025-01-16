const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');

let streamCheckInterval = null;
let streamChannelId = null;
let streamerName = null;
let platform = null;
let roleId = null;

module.exports = {
    name: 'stream',
    description: 'Set up stream or post checking functionality',
    options: [
        {
            name: 'channel_id',
            type: 'STRING',
            description: 'The ID of the channel to send notifications to',
            required: true,
        },
        {
            name: 'platform',
            type: 'STRING',
            description: 'The platform to check (twitch or bluesky)',
            required: true,
        },
        {
            name: 'streamer_name',
            type: 'STRING',
            description: 'The name of the streamer or Bluesky user',
            required: true,
        },
        {
            name: 'role_id',
            type: 'STRING',
            description: 'The ID of the role to ping (optional)',
            required: false,
        },
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to use this command.');
        }

        streamChannelId = interaction.options.getString('channel_id');
        platform = interaction.options.getString('platform').toLowerCase();
        streamerName = interaction.options.getString('streamer_name');
        roleId = interaction.options.getString('role_id') || null;

        if (streamCheckInterval) {
            clearInterval(streamCheckInterval);
        }

        streamCheckInterval = setInterval(async () => {
            const isLive = await checkStreamStatus(platform, streamerName);
            if (isLive) {
                const channel = interaction.guild.channels.cache.get(streamChannelId);
                if (channel) {
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${streamerName} is live on ${platform}!`)
                        .setDescription(`Check out the stream: ${getStreamUrl(platform, streamerName)}`);
                    if (roleId) {
                        channel.send({ content: `<@&${roleId}>`, embeds: [embed] });
                    } else {
                        channel.send({ embeds: [embed] });
                    }
                }
            } else if (platform === 'bluesky') {
                const newPost = await checkBlueskyPosts(streamerName);
                if (newPost) {
                    const channel = interaction.guild.channels.cache.get(streamChannelId);
                    if (channel) {
                        const embed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle(`${streamerName} has a new post on Bluesky!`)
                            .setDescription(`Check out the post: ${newPost.url}`);
                        if (roleId) {
                            channel.send({ content: `<@&${roleId}>`, embeds: [embed] });
                        } else {
                            channel.send({ embeds: [embed] });
                        }
                    }
                }
            }
        }, 300000); // Check every 5 minutes

        interaction.reply(`Stream or post checking set up for ${streamerName} on ${platform} in channel <#${streamChannelId}>.`);
    }
};

async function checkStreamStatus(platform, streamerName) {
    if (platform === 'twitch') {
        const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName}`, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
            }
        });
        const data = await response.json();
        return data.data && data.data.length > 0;
    }
    return false;
}

async function checkBlueskyPosts(username) {
    try {
        const response = await fetch(`https://api.bluesky.com/users/${username}/posts`, {
            headers: {
                'Authorization': `Bearer ${process.env.BLUESKY_ACCESS_TOKEN}`
            }
        });
        const posts = await response.json();
        if (posts && posts.length > 0) {
            return posts[0]; // Return the latest post
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}

function getStreamUrl(platform, streamerName) {
    if (platform === 'twitch') {
        return `https://twitch.tv/${streamerName}`;
    } else if (platform === 'bluesky') {
        return `https://bluesky.com/${streamerName}`;
    }
    return '';
}