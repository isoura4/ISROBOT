import fs from 'fs';
import path from 'path';

export default {
  name: 'count',
  description: 'Handles the counting game logic',
  async execute(interaction, t) {
    const channelId = interaction.channel.id;
    const stateFilePath = path.join(process.cwd(), 'src', 'commands', 'count-state.json');
    let gameState = {
      currentNumber: 0,
      lastUser: null,
      gameChannelId: channelId,
      counterBroken: false,
      savedValue: 0,
    };
    if (fs.existsSync(stateFilePath)) {
      try {
        gameState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
      } catch (error) {
        console.error("Error reading/parsing count state file:", error);
      }
    }
    const number = parseInt(interaction.options?.getString('number') || interaction.content, 10);
    if (isNaN(number)) return;

    if (number === gameState.currentNumber + 1) {
      gameState.currentNumber = number;
      gameState.lastUser = interaction.user.id;
      fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
      return interaction.reply({ content: t('count.success', { number: gameState.currentNumber }), flags: 64 });
    } else {
      const useCounterSaver = process.env.COUNTER_SAVER_ENABLED?.toLowerCase() === 'true';
      gameState.savedValue = gameState.currentNumber;
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      gameState.counterBroken = false;
      fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
      if (useCounterSaver) {
        return interaction.reply({ content: t('count.error_combined', { number: gameState.savedValue }), flags: 64 });
      } else {
        return interaction.reply({ content: t('count.error_wrong'), flags: 64 });
      }
    }
  },
};