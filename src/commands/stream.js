const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');

let streamCheckInterval = null;
let streamChannelId = null;
let streamerName = null;
let platform = null;

module.exports = {
    name: 'stream',
    description: 'Set up stream or post checking functionality',
    async execute(message, args) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        if (args.length < 3) {
            return message.reply('Usage: !stream <channel_id> <platform> <streamer_name>');
        }

        streamChannelId = args[0];
        platform = args[1].toLowerCase();
        streamerName = args[2];

        if (streamCheckInterval) {
            clearInterval(streamCheckInterval);
        }

        streamCheckInterval = setInterval(async () => {
            const isLive = await checkStreamStatus(platform, streamerName);
            if (isLive) {
                const channel = message.guild.channels.cache.get(streamChannelId);
                if (channel) {
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${streamerName} is live on ${platform}!`)
                        .setDescription(`Check out the stream: ${getStreamUrl(platform, streamerName)}`);
                    channel.send({ embeds: [embed] });
                }
            } else if (platform === 'bluesky') {
                const newPost = await checkBlueskyPosts(streamerName);
                if (newPost) {
                    const channel = message.guild.channels.cache.get(streamChannelId);
                    if (channel) {
                        const embed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle(`${streamerName} has a new post on Bluesky!`)
                            .setDescription(`Check out the post: ${newPost.url}`);
                        channel.send({ embeds: [embed] });
                    }
                }
            }
        }, 300000); // Check every 5 minutes

        message.reply(`Stream or post checking set up for ${streamerName} on ${platform} in channel <#${streamChannelId}>.`);
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