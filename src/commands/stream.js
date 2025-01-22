import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let streamCheckInterval = null;
const stateFilePath = path.join(__dirname, 'stream-state.json');

let streamState = {
    twitch: [],
    bluesky: {
        streamChannelId: null,
        streamerName: null,
        roleId: null
    },
    announcedStreams: {} // Track announced streams
};

// Load the stream state from the file
function loadStreamState() {
    if (fs.existsSync(stateFilePath)) {
        try {
            const data = fs.readFileSync(stateFilePath, 'utf8');
            streamState = JSON.parse(data);
        } catch (error) {
            console.error('Error loading stream state:', error);
        }
    }
    if (!streamState.announcedStreams) {
        streamState.announcedStreams = {};
    }
}

// Save the stream state to the file
function saveStreamState() {
    try {
        fs.writeFileSync(stateFilePath, JSON.stringify(streamState, null, 2));
    } catch (error) {
        console.error('Error saving stream state:', error);
    }
}

loadStreamState();

export function startStreamCheckInterval(guild, dialogues) {
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
    }

    streamCheckInterval = setInterval(async () => {
        console.log('Checking stream status...');
        const oauthToken = await getTwitchOAuthToken();
        for (const twitchStreamer of streamState.twitch) {
            const streamData = await checkStreamStatus('twitch', twitchStreamer.streamerName, oauthToken);
            console.log(`Checking if ${twitchStreamer.streamerName} is live: ${streamData ? 'Yes' : 'No'}`);
            if (streamData) {
                const startTime = streamData.started_at;
                if (!streamState.announcedStreams[twitchStreamer.streamerName] || streamState.announcedStreams[twitchStreamer.streamerName].startTime !== startTime) {
                    const channel = guild.channels.cache.get(twitchStreamer.streamChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(streamData.title)
                            .setDescription(`**Channel:** ${streamData.user_name}\n**Category:** ${streamData.game_name}`)
                            .setImage(streamData.thumbnail_url.replace('{width}', '320').replace('{height}', '180'))
                            .setURL(getStreamUrl('twitch', twitchStreamer.streamerName));
                        if (twitchStreamer.roleId) {
                            await channel.send({ content: `<@&${twitchStreamer.roleId}>`, embeds: [embed] });
                        } else {
                            await channel.send({ embeds: [embed] });
                        }
                        console.log(`Notification sent for ${twitchStreamer.streamerName}`);
                        streamState.announcedStreams[twitchStreamer.streamerName] = {
                            announced: true,
                            startTime: startTime
                        }; // Mark stream as announced with start time
                        saveStreamState();
                    } else {
                        console.log(`Channel not found: ${twitchStreamer.streamChannelId}`);
                    }
                }
            } else {
                // Reset the announcement status if the stream is not live
                if (streamState.announcedStreams[twitchStreamer.streamerName]) {
                    streamState.announcedStreams[twitchStreamer.streamerName].announced = false;
                    saveStreamState();
                }
            }
        }

        if (streamState.bluesky.streamerName) {
            const newPost = await checkBlueskyPosts(streamState.bluesky.streamerName);
            if (newPost) {
                const channel = guild.channels.cache.get(streamState.bluesky.streamChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(dialogues.stream.bluesky_post_title.replace('{streamerName}', streamState.bluesky.streamerName))
                        .setDescription(dialogues.stream.bluesky_post_description.replace('{postUrl}', newPost.url));
                    if (streamState.bluesky.roleId) {
                        await channel.send({ content: `<@&${streamState.bluesky.roleId}>`, embeds: [embed] });
                    } else {
                        await channel.send({ embeds: [embed] });
                    }
                }
            }
        }
    }, 300000); // Check every 5 minutes
}

export default {
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
    async execute(interaction, dialogues) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: dialogues.stream.no_permission, ephemeral: true });
        }

        const platform = interaction.options.getString('platform').toLowerCase();
        const streamerName = interaction.options.getString('streamer_name');
        const streamChannelId = interaction.options.getChannel('channel').id;
        const roleId = interaction.options.getRole('role_id') ? interaction.options.getRole('role_id').id : null;

        if (platform === 'twitch') {
            const existingStreamer = streamState.twitch.find(streamer => streamer.streamerName === streamerName);
            if (existingStreamer) {
                existingStreamer.streamChannelId = streamChannelId;
                existingStreamer.roleId = roleId;
            } else {
                streamState.twitch.push({
                    streamChannelId,
                    streamerName,
                    roleId
                });
            }
        } else if (platform === 'bluesky') {
            streamState.bluesky.streamChannelId = streamChannelId;
            streamState.bluesky.streamerName = streamerName;
            streamState.bluesky.roleId = roleId;
        } else {
            return interaction.reply(dialogues.stream.invalid_platform);
        }

        saveStreamState();
        startStreamCheckInterval(interaction.guild, dialogues);

        interaction.reply(dialogues.stream.setup_success.replace('{streamerName}', streamerName).replace('{platform}', platform).replace('{channelId}', streamChannelId));
    }
};

async function getTwitchOAuthToken() {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        console.log('Obtained Twitch OAuth token');
        return response.data.access_token;
    } catch (error) {
        console.error('Error obtaining Twitch OAuth token:', error);
        return null;
    }
}

async function checkStreamStatus(platform, streamerName, oauthToken) {
    if (platform === 'twitch') {
        try {
            const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName}`, {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${oauthToken}`
                }
            });
            const data = await response.json();
            console.log(`Twitch API response for ${streamerName}:`, data);
            if (data.data && data.data.length > 0) {
                return data.data[0]; // Return the stream data
            }
        } catch (error) {
            console.error(`Error checking Twitch stream status for ${streamerName}:`, error);
        }
    }
    return null;
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