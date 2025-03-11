import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Ensure .env contains our new API key lines.
function ensureEnvKeys() {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const requiredKeys = ['YOUTUBE_API_KEY', 'TIKTOK_API_KEY', 'INSTAGRAM_API_KEY'];
  let updated = false;
  for (const key of requiredKeys) {
    const regex = new RegExp(`^${key}=`, 'm');
    if (!regex.test(content)) {
      content += `\n${key}=`;
      updated = true;
    }
  }
  if (updated) {
    fs.writeFileSync(envPath, content);
    console.log('Updated .env file with missing API key lines.');
  }
}
ensureEnvKeys();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let streamCheckInterval = null;
const stateFilePath = path.join(__dirname, 'stream-state.json');

// Default stream state.
const defaultStreamState = {
  twitch: [],
  youtube: [],
  tiktok: [],
  instagram: [],
  bluesky: {
    streamChannelId: null,
    streamerName: null,
    roleId: null
  },
  announcedStreams: {}
};

let streamState = { ...defaultStreamState };

// Load the stream state from file and merge with defaults.
function loadStreamState() {
  if (fs.existsSync(stateFilePath)) {
    try {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      const parsed = JSON.parse(data);
      streamState = { ...defaultStreamState, ...parsed };
      streamState.twitch = parsed.twitch || [];
      streamState.youtube = parsed.youtube || [];
      streamState.tiktok = parsed.tiktok || [];
      streamState.instagram = parsed.instagram || [];
      streamState.announcedStreams = parsed.announcedStreams || {};
    } catch (error) {
      console.error('Error loading stream state:', error);
    }
  }
}
loadStreamState();

// Save the stream state to file.
function saveStreamState() {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(streamState, null, 2));
  } catch (error) {
    console.error('Error saving stream state:', error);
  }
}

export function startStreamCheckInterval(guild, dialogues) {
  if (streamCheckInterval) {
    clearInterval(streamCheckInterval);
  }

  streamCheckInterval = setInterval(async () => {
    console.log('Checking stream status...');

    // TWITCH
    const twitchOAuth = await getTwitchOAuthToken();
    for (const streamer of streamState.twitch) {
      const streamData = await checkTwitchStatus(streamer.streamerName, twitchOAuth);
      processStreamStatus(guild, dialogues, streamData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'twitch');
    }

    // YOUTUBE: Check both live and post events.
    for (const streamer of streamState.youtube) {
      const liveData = await checkYouTubeLiveStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, liveData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'youtube live');
      const postData = await checkYouTubePostStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, postData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'youtube post');
    }

    // TIKTOK: Check live and post events.
    for (const streamer of streamState.tiktok) {
      const liveData = await checkTikTokLiveStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, liveData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'tiktok live');
      const postData = await checkTikTokPostStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, postData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'tiktok post');
    }

    // INSTAGRAM: Check live, posts, and stories.
    for (const streamer of streamState.instagram) {
      const liveData = await checkInstagramLiveStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, liveData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'instagram live');
      const postData = await checkInstagramPostStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, postData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'instagram post');
      const storieData = await checkInstagramStorieStatus(streamer.streamerName);
      processStreamStatus(guild, dialogues, storieData, streamer.streamerName, streamer.streamChannelId, streamer.roleId, 'instagram storie');
    }

    // BLUESKY (existing)
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

function processStreamStatus(guild, dialogues, streamData, streamerName, streamChannelId, roleId, platform) {
  if (streamData) {
    const startTime = streamData.started_at || streamData.startTime || Date.now();
    const key = platform + '_' + streamerName;
    if (
      !streamState.announcedStreams[key] ||
      streamState.announcedStreams[key].startTime !== startTime
    ) {
      const channel = guild.channels.cache.get(streamChannelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(streamData.title || `${streamerName} is live on ${platform}!`)
          .setDescription(`**Channel:** ${streamerName}\n**Category:** ${streamData.category || 'Live / Post'}`)
          .setURL(getStreamUrl(platform, streamerName));
        if (streamData.thumbnail_url) {
          let thumbUrl = streamData.thumbnail_url;
          if (thumbUrl.includes('{width}') || thumbUrl.includes('{height}')) {
            thumbUrl = thumbUrl.replace('{width}', '480').replace('{height}', '270');
          }
          embed.setImage(thumbUrl);
        }
        if (roleId) {
          channel.send({ content: `<@&${roleId}>`, embeds: [embed] });
        } else {
          channel.send({ embeds: [embed] });
        }
        console.log(`Notification sent for ${streamerName} on ${platform}`);
        streamState.announcedStreams[key] = { announced: true, startTime };
        saveStreamState();
      } else {
        console.error(`Channel not found: ${streamChannelId}`);
      }
    }
  } else {
    const key = platform + '_' + streamerName;
    if (streamState.announcedStreams[key]) {
      streamState.announcedStreams[key].announced = false;
      saveStreamState();
    }
  }
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
      description: 'The platform to check (twitch, youtube, tiktok, instagram, or bluesky)',
      required: true,
    },
    {
      name: 'streamer_name',
      type: 3, // STRING
      description: 'The name of the streamer or account',
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
      const existing = streamState.twitch.find(s => s.streamerName === streamerName);
      if (existing) {
        existing.streamChannelId = streamChannelId;
        existing.roleId = roleId;
      } else {
        streamState.twitch.push({ streamChannelId, streamerName, roleId });
      }
    } else if (platform === 'youtube') {
      const existing = streamState.youtube.find(s => s.streamerName === streamerName);
      if (existing) {
        existing.streamChannelId = streamChannelId;
        existing.roleId = roleId;
      } else {
        streamState.youtube.push({ streamChannelId, streamerName, roleId });
      }
    } else if (platform === 'tiktok') {
      const existing = streamState.tiktok.find(s => s.streamerName === streamerName);
      if (existing) {
        existing.streamChannelId = streamChannelId;
        existing.roleId = roleId;
      } else {
        streamState.tiktok.push({ streamChannelId, streamerName, roleId });
      }
    } else if (platform === 'instagram') {
      const existing = streamState.instagram.find(s => s.streamerName === streamerName);
      if (existing) {
        existing.streamChannelId = streamChannelId;
        existing.roleId = roleId;
      } else {
        streamState.instagram.push({ streamChannelId, streamerName, roleId });
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

    interaction.reply(
      dialogues.stream.setup_success
        .replace('{streamerName}', streamerName)
        .replace('{platform}', platform)
        .replace('{channelId}', streamChannelId)
    );
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

async function checkTwitchStatus(streamerName, oauthToken) {
  try {
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${oauthToken}`
      }
    });
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
  } catch (error) {
    console.error(`Error checking Twitch status for ${streamerName}:`, error);
  }
  return null;
}

// --- YouTube Functions ---
async function checkYouTubeLiveStatus(streamerName) {
  console.log(`Checking YouTube live status for ${streamerName} (stub)`);
  // Use process.env.YOUTUBE_API_KEY to add a proper request.
  return null;
}
async function checkYouTubePostStatus(streamerName) {
  console.log(`Checking YouTube posts for ${streamerName} (stub)`);
  return null;
}

// --- TikTok Functions ---
async function checkTikTokLiveStatus(streamerName) {
  console.log(`Checking TikTok live status for ${streamerName} (stub)`);
  // Use process.env.TIKTOK_API_KEY to add a proper request.
  return null;
}
async function checkTikTokPostStatus(streamerName) {
  console.log(`Checking TikTok posts for ${streamerName} (stub)`);
  return null;
}

// --- Instagram Functions ---
async function checkInstagramLiveStatus(streamerName) {
  console.log(`Checking Instagram live status for ${streamerName} (stub)`);
  // Use process.env.INSTAGRAM_API_KEY to add a proper request.
  return null;
}
async function checkInstagramPostStatus(streamerName) {
  console.log(`Checking Instagram posts for ${streamerName} (stub)`);
  return null;
}
async function checkInstagramStorieStatus(streamerName) {
  console.log(`Checking Instagram stories for ${streamerName} (stub)`);
  return null;
}

// --- Bluesky Function (existing) ---
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
      return posts[0];
    }
  } catch (error) {
    console.error(error);
  }
  return null;
}

function getStreamUrl(platform, streamerName) {
  if (platform.includes('twitch')) {
    return `https://twitch.tv/${streamerName}`;
  } else if (platform.includes('youtube')) {
    return `https://www.youtube.com/${streamerName}`;
  } else if (platform.includes('tiktok')) {
    return `https://www.tiktok.com/@${streamerName}`;
  } else if (platform.includes('instagram')) {
    return `https://www.instagram.com/${streamerName}`;
  } else if (platform.includes('bluesky')) {
    return `https://bluesky.com/${streamerName}`;
  }
  return '';
}