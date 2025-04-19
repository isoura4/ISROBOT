import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { musicQueues } from './music.js';

export default {
  name: 'stop',
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),
  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      connection.destroy();
    }
    musicQueues.set(interaction.guild.id, []);
    await interaction.reply('Playback stopped and queue cleared.');
  }
};