import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, getVoiceConnection } from '@discordjs/voice';
import { spawn } from 'child_process';

export const musicQueues = new Map();
export const players = new Map();
const disconnectTimers = new Map();

function cleanupProcesses(player) {
  if (!player) return;
  if (player?.ffmpeg) try { player.ffmpeg.kill('SIGKILL'); } catch {}
  if (player?.ytdlp) try { player.ytdlp.kill('SIGKILL'); } catch {}
  player.ffmpeg = null;
  player.ytdlp = null;
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
  const { url, interaction } = queue[0]; // Don't shift yet

  // Clean up previous processes if any
  let player = players.get(guildId);
  cleanupProcesses(player);

  const ytdlp = spawn('/var/data/python/bin/yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-',
    url
  ]);
  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);
  ytdlp.stdout.pipe(ffmpeg.stdin);

  const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
  if (!player) {
    player = createAudioPlayer();
    players.set(guildId, player);
    connection.subscribe(player);
  }

  // Store ffmpeg/ytdlp for cleanup
  player.ffmpeg = ffmpeg;
  player.ytdlp = ytdlp;

  player.play(resource);

  player.removeAllListeners(AudioPlayerStatus.Idle);
  player.removeAllListeners('error');

  const next = () => {
    // Remove the song that just finished
    const q = musicQueues.get(guildId) || [];
    q.shift();
    musicQueues.set(guildId, q);
    cleanupProcesses(player);
    playNext(guildId, connection, dialogues);
  };

  player.on(AudioPlayerStatus.Idle, next);
  player.on('error', (error) => {
    console.error('Audio player error:', error);
    next();
  });
  ffmpeg.on('error', (error) => {
    console.error('ffmpeg error:', error);
    next();
  });
  ytdlp.on('error', (error) => {
    console.error('yt-dlp error:', error);
    next();
  });

  // Only edit reply if this is the first song in the queue (i.e., just started playing)
  if (interaction && interaction.editReply) {
    interaction.editReply({ content: dialogues.music.playing.replace('{url}', url) }).catch(() => {});
  }
}

export default {
  name: 'play',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play audio from a YouTube or direct URL (queue supported)')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The URL of the video or audio')
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

    // Cancel disconnect timer if exists
    if (disconnectTimers.has(interaction.guild.id)) {
      clearTimeout(disconnectTimers.get(interaction.guild.id));
      disconnectTimers.delete(interaction.guild.id);
    }

    // Add to queue
    if (!musicQueues.has(interaction.guild.id)) musicQueues.set(interaction.guild.id, []);
    const queue = musicQueues.get(interaction.guild.id);
    queue.push({ url, interaction });
    musicQueues.set(interaction.guild.id, queue);

    // Only start playing if not already playing
    let player = players.get(interaction.guild.id);
    if (!player || player.state.status === AudioPlayerStatus.Idle) {
      playNext(interaction.guild.id, connection, dialogues);
    } else {
      await interaction.editReply({ content: dialogues.music.added_to_queue.replace('{url}', url) });
    }
  }
};