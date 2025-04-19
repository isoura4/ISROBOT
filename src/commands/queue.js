import { SlashCommandBuilder } from 'discord.js';
import { musicQueues } from './music.js';

export default {
  name: 'queue',
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),
  async execute(interaction, dialogues) {
    const queue = musicQueues.get(interaction.guild.id) || [];
    if (queue.length === 0) {
      await interaction.reply(dialogues.music.queue_empty);
      return;
    }
    const list = queue.map((item, i) => `${i + 1}. ${item.url}`).join('\n');
    await interaction.reply(`Current queue:\n${list}`);
  }
};