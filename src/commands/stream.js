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

// Path to the old JSON file (to migrate if exists)
const jsonStatePath = path.join(__dirname, 'stream-state.json');

/**
 * Migrates any existing stream-state.json data into the database.
 * It migrates Twitch (array) and Bluesky (object) settings,
 * including any announcement info from "announcedStreams".
 */
async function migrateStreamStateToDB() {
  if (!fs.existsSync(jsonStatePath)) return;
  try {
    const data = fs.readFileSync(jsonStatePath, 'utf8');
    const oldState = JSON.parse(data);
    const db = await import('../database.js').then(module => module.default);

    // Migrate Twitch settings.
    if (oldState.twitch && Array.isArray(oldState.twitch)) {
      for (const twitchConfig of oldState.twitch) {
         let announced = 0, startTime = null;
         const key = `twitch_${twitchConfig.streamerName}`;
         if (oldState.announcedStreams && oldState.announcedStreams[key]) {
           announced = oldState.announcedStreams[key].announced ? 1 : 0;
           startTime = oldState.announcedStreams[key].startTime;
         }
         await db.run(
           `INSERT OR REPLACE INTO streams (platform, streamerName, streamChannelId, roleId, announced, startTime)
            VALUES (?, ?, ?, ?, ?, ?)`,
           'twitch',
           twitchConfig.streamerName,
           twitchConfig.streamChannelId,
           twitchConfig.roleId,
           announced,
           startTime
         );
      }
    }
    // Migrate Bluesky settings.
    if (oldState.bluesky && oldState.bluesky.streamerName) {
       let announced = 0, startTime = null;
       const key = `bluesky_${oldState.bluesky.streamerName}`;
       if (oldState.announcedStreams && oldState.announcedStreams[key]) {
           announced = oldState.announcedStreams[key].announced ? 1 : 0;
           startTime = oldState.announcedStreams[key].startTime;
       }
       await db.run(
         `INSERT OR REPLACE INTO streams (platform, streamerName, streamChannelId, roleId, announced, startTime)
          VALUES (?, ?, ?, ?, ?, ?)`,
         'bluesky',
         oldState.bluesky.streamerName,
         oldState.bluesky.streamChannelId,
         oldState.bluesky.roleId,
         announced,
         startTime
       );
    }
    // Remove the old JSON file after migration.
    fs.unlinkSync(jsonStatePath);
    console.log('Migrated stream-state.json to SQLite database.');
  } catch (error) {
    console.error('Error migrating stream state:', error);
  }
}

// Modified startStreamCheckInterval now reads stream configurations directly from the DB.
export async function startStreamCheckInterval(guild, dialogues) {
  // Run migration first.
  await migrateStreamStateToDB();
  const db = await import('../database.js').then(module => module.default);
  if (streamCheckInterval) clearInterval(streamCheckInterval);

  streamCheckInterval = setInterval(async () => {
    console.log('Checking stream status...');

    // TWITCH: Select all twitch streams.
    const twitchStreams = await db.all(`SELECT * FROM streams WHERE platform = 'twitch'`);
    const twitchOAuth = await getTwitchOAuthToken();
    for (const stream of twitchStreams) {
      const streamData = await checkTwitchStatus(stream.streamerName, twitchOAuth);
      processStreamStatus(guild, dialogues, streamData, stream.streamerName, stream.streamChannelId, stream.roleId, 'twitch');
    }

    // BLUESKY: Get the bluesky stream (if any).
    const blueskyStream = await db.get(`SELECT * FROM streams WHERE platform = 'bluesky'`);
    if (blueskyStream && blueskyStream.streamerName) {
      const newPost = await checkBlueskyPosts(blueskyStream.streamerName);
      if (newPost) {
        const channel = guild.channels.cache.get(blueskyStream.streamChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(dialogues.stream.bluesky_post_title.replace('{streamerName}', blueskyStream.streamerName))
            .setDescription(dialogues.stream.bluesky_post_description.replace('{postUrl}', newPost.url));
          if (blueskyStream.roleId) {
            await channel.send({ content: `<@&${blueskyStream.roleId}>`, embeds: [embed] });
          } else {
            await channel.send({ embeds: [embed] });
          }
        }
      }
    }
  }, 300000); // Every 5 minutes.
}

// Update announcement status in the database.
function processStreamStatus(guild, dialogues, streamData, streamerName, streamChannelId, roleId, platform) {
  (async () => {
    const db = await import('../database.js').then(module => module.default);
    if (streamData) {
      const startTime = streamData.started_at || streamData.startTime || Date.now();
      // Compare the stored startTime (as a string) with the current startTime (as a string)
      const record = await db.get(
        `SELECT announced, startTime FROM streams WHERE platform = ? AND streamerName = ?`,
        platform,
        streamerName
      );
      if (!record || String(record.startTime) !== String(startTime)) {
        const channel = guild.channels.cache.get(streamChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(streamData.title || `${streamerName} is live on ${platform}!`);
  
          let category = streamData.category || 'Live / Post';
          if (platform === 'twitch' && (category === 'Live / Post' || !category)) {
            category = streamData.game_name || category;
          }
          embed.setDescription(`**Channel:** ${streamerName}\n**Category:** ${category}`)
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
          await db.run(
            `UPDATE streams SET announced = 1, startTime = ? WHERE platform = ? AND streamerName = ?`,
            startTime,
            platform,
            streamerName
          );
        } else {
          console.error(`Channel not found: ${streamChannelId}`);
        }
      }
    } else {
      await db.run(
        `UPDATE streams SET announced = 0 WHERE platform = ? AND streamerName = ?`,
        platform,
        streamerName
      );
    }
  })();
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

    const db = await import('../database.js').then(module => module.default);
    if (platform === 'twitch' || platform === 'bluesky') {
      await db.run(
        `INSERT OR REPLACE INTO streams (platform, streamerName, streamChannelId, roleId)
         VALUES (?, ?, ?, ?)`,
         platform, streamerName, streamChannelId, roleId
      );
    } else {
      return interaction.reply(dialogues.stream.invalid_platform);
    }

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
  } else if (platform.includes('bluesky')) {
    return `https://bluesky.com/${streamerName}`;
  }
  return '';
}