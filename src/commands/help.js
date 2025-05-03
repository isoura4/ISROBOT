import { SlashCommandBuilder } from 'discord.js';

export default {
  name: 'help',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help for all commands'),
  async execute(interaction, t) {
    const helpText = t('general.help');
    await interaction.reply({ content: helpText, ephemeral: true });
  }
};