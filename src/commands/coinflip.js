export default {
  name: 'coinflip',
  description: 'Flip a coin to get Heads or Tails',
  async execute(interaction, t) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return interaction.reply({ content: t('coinflip.result', { result }), flags: 64 });
  },
};