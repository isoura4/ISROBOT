import { SlashCommandBuilder } from 'discord.js';
import { generateDependencyReport } from '@discordjs/voice';

export default {
  name: 'voicereport',
  data: new SlashCommandBuilder()
    .setName('voicereport')
    .setDescription('Show Discord voice/audio dependency report'),
  async execute(interaction) {
    const report = generateDependencyReport();
    await interaction.reply({ content: `\`\`\`\n${report}\n\`\`\``, ephemeral: true });
  }
};