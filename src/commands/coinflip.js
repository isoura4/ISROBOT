export default {
    name: 'coinflip',
    description: 'Flip a coin to get Heads or Tails',
    async execute(interaction, dialogues) {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const message = (dialogues.coinflip && dialogues.coinflip.result)
        ? dialogues.coinflip.result.replace('{result}', result)
        : `The coin landed on ${result}!`;
      return interaction.reply({ content: message, flags: 64 });
    },
  };