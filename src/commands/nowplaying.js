import { SlashCommandBuilder } from 'discord.js';
import { musicQueues } from './music.js';

export default {
  name: 'nowplaying',
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),
  async execute(interaction, dialogues) {
    const queue = musicQueues.get(interaction.guild.id) || [];
    if (queue.length === 0) {
      await interaction.reply(dialogues.music.queue_empty);
      return;
    }
    const { url } = queue[0];
    await interaction.reply(dialogues.music.now_playing.replace('{url}', url));
  }
};