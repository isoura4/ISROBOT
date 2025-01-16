const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let streamCheckInterval = null;
const stateFilePath = path.join(__dirname, 'stream-state.json');

let streamState = {
    twitch: {
        streamChannelId: null,
        streamerName: null,
        roleId: null
    },
    bluesky: {
        streamChannelId: null,
        streamerName: null,
        roleId: null
    }
};

// Load the stream state from the file
function loadStreamState() {
    if (fs.existsSync(stateFilePath)) {
        const data = fs.readFileSync(stateFilePath, 'utf8');
        streamState = JSON.parse(data);
    }
}

// Save the stream state to the file
function saveStreamState() {
    fs.writeFileSync(stateFilePath, JSON.stringify(streamState, null, 2));
}

loadStreamState();

module.exports = {
    name: 'stream',
    description: 'Set up stream or post checking functionality',
    options: [
        {
            name: 'channel',
            type: 7, // CHANNEL
            description: 'The channel to send notifications to',
            required: true,
        },
        {
            name: 'platform',
            type: 3, // STRING
            description: 'The platform to check (twitch or bluesky)',
            required: true,
        },
        {
            name: 'streamer_name',
            type: 3, // STRING
            description: 'The name of the streamer or Bluesky user',
            required: true,
        },
        {
            name: 'role_id',
            type: 8, // ROLE
            description: 'The role to ping (optional)',
            required: false,
        },
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to use this command.');
        }

        const platform = interaction.options.getString('platform').toLowerCase();
        const streamerName = interaction.options.getString('streamer_name');
        const streamChannelId = interaction.options.getChannel('channel').id;
        const roleId = interaction.options.getRole('role_id') ? interaction.options.getRole('role_id').id : null;

        if (platform === 'twitch') {
            streamState.twitch.streamChannelId = streamChannelId;
            streamState.twitch.streamerName = streamerName;
            streamState.twitch.roleId = roleId;
        } else if (platform === 'bluesky') {
            streamState.bluesky.streamChannelId = streamChannelId;
            streamState.bluesky.streamerName = streamerName;
            streamState.bluesky.roleId = roleId;
        } else {
            return interaction.reply('Invalid platform. Please choose either "twitch" or "bluesky".');
        }

        saveStreamState();

        if (streamCheckInterval) {
            clearInterval(streamCheckInterval);
        }

        streamCheckInterval = setInterval(async () => {
            if (streamState.twitch.streamerName) {
                const isLive = await checkStreamStatus('twitch', streamState.twitch.streamerName);
                if (isLive) {
                    const channel = interaction.guild.channels.cache.get(streamState.twitch.streamChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`${streamState.twitch.streamerName} is live on Twitch!`)
                            .setDescription(`Check out the stream: ${getStreamUrl('twitch', streamState.twitch.streamerName)}`);
                        if (streamState.twitch.roleId) {
                            channel.send({ content: `<@&${streamState.twitch.roleId}>`, embeds: [embed] });
                        } else {
                            channel.send({ embeds: [embed] });
                        }
                    }
                }
            }

            if (streamState.bluesky.streamerName) {
                const newPost = await checkBlueskyPosts(streamState.bluesky.streamerName);
                if (newPost) {
                    const channel = interaction.guild.channels.cache.get(streamState.bluesky.streamChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`${streamState.bluesky.streamerName} has a new post on Bluesky!`)
                            .setDescription(`Check out the post: ${newPost.url}`);
                        if (streamState.bluesky.roleId) {
                            channel.send({ content: `<@&${streamState.bluesky.roleId}>`, embeds: [embed] });
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
        const tokenResponse = await axios.post('https://api.bluesky.com/token', {
            username: process.env.BLUESKY_USERNAME,
            password: process.env.BLUESKY_PASSWORD
        });

        const token = tokenResponse.data.token;

        const response = await fetch(`https://api.bluesky.com/users/${username}/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`
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