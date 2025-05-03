import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, getVoiceConnection, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';

export const musicQueues = new Map();
export const players = new Map();
const disconnectTimers = new Map();

async function waitForConnection(connection) {
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    return true;
  } catch {
    return false;
  }
}

function cleanupFFmpeg(ffmpeg) {
  if (ffmpeg) {
    try { ffmpeg.stdin.destroy(); } catch {}
    try { ffmpeg.stdout.destroy(); } catch {}
    try { ffmpeg.kill('SIGKILL'); } catch {}
  }
}

function playNext(guildId, connection, dialogues) {
  const queue = musicQueues.get(guildId);
  if (!queue || queue.length === 0) {
    // Start disconnect timer (10 min)
    if (connection) {
      if (disconnectTimers.has(guildId)) clearTimeout(disconnectTimers.get(guildId));
      disconnectTimers.set(guildId, setTimeout(() => {
        connection.destroy();
        disconnectTimers.delete(guildId);
        players.delete(guildId);
      }, 10 * 60 * 1000));
    }
    return;
  }
  const { url, interaction } = queue[0];

  let player = players.get(guildId);

  // Clean up previous resource if any
  if (player && player.resource) {
    try { player.stop(); } catch {}
    player.resource = null;
  }

  // Create YouTube audio stream and pipe through ffmpeg-static for PCM conversion
  const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);
  stream.pipe(ffmpeg.stdin);

  // Robust error handling for streams
  stream.on('error', (err) => {
    console.error(`[Music] ytdl error in guild ${guildId}:`, err);
    cleanupFFmpeg(ffmpeg);
    next();
  });
  ffmpeg.stdin.on('error', (err) => {
    if (err.code !== 'EPIPE') console.error(`[Music] ffmpeg.stdin error in guild ${guildId}:`, err);
  });
  ffmpeg.stdout.on('error', (err) => {
    console.error(`[Music] ffmpeg.stdout error in guild ${guildId}:`, err);
  });

  const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
  if (!player) {
    player = createAudioPlayer();
    players.set(guildId, player);
    connection.subscribe(player);
  }

  player.resource = resource;
  player.play(resource);

  player.removeAllListeners(AudioPlayerStatus.Idle);
  player.removeAllListeners('error');

  const next = () => {
    const q = musicQueues.get(guildId) || [];
    q.shift();
    musicQueues.set(guildId, q);
    cleanupFFmpeg(ffmpeg);
    playNext(guildId, connection, dialogues);
  };

  player.on(AudioPlayerStatus.Idle, next);
  player.on('error', (error) => {
    console.error(`[Music] Audio player error in guild ${guildId} for ${url}:`, error);
    next();
  });
  ffmpeg.on('error', (error) => {
    console.error(`[Music] ffmpeg process error in guild ${guildId} for ${url}:`, error);
    next();
  });

  if (interaction && interaction.editReply) {
    interaction.editReply({ content: dialogues.music.playing.replace('{url}', url) }).catch(() => {});
  }
}

export default {
  name: 'play',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play audio from a YouTube URL (queue supported)')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The YouTube URL')
        .setRequired(true)
    ),
  async execute(interaction, dialogues) {
    const url = interaction.options.getString('url');
    const voiceChannel = interaction.member.voice?.channel;
    if (!voiceChannel) {
      await interaction.reply({ content: dialogues.music.must_be_in_voice, ephemeral: true });
      return;
    }
    await interaction.deferReply();

    // Join the voice channel
    let connection = getVoiceConnection(interaction.guild.id);
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
    }

    // Wait for connection to be ready
    const ready = await waitForConnection(connection);
    if (!ready) {
      await interaction.editReply({ content: 'Failed to join voice channel.' });
      return;
    }

    // Cancel disconnect timer if exists
    if (disconnectTimers.has(interaction.guild.id)) {
      clearTimeout(disconnectTimers.get(interaction.guild.id));
      disconnectTimers.delete(interaction.guild.id);
    }

    // Add to queue and decide if we should start playback
    if (!musicQueues.has(interaction.guild.id)) musicQueues.set(interaction.guild.id, []);
    const queue = musicQueues.get(interaction.guild.id);
    const wasEmpty = queue.length === 0;
    queue.push({ url, interaction });
    musicQueues.set(interaction.guild.id, queue);

    if (wasEmpty) {
      playNext(interaction.guild.id, connection, dialogues);
    } else {
      await interaction.editReply({ content: dialogues.music.added_to_queue.replace('{url}', url) });
    }
  }
};