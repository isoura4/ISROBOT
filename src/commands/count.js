import fs from 'fs';
import path from 'path';

export default {
  name: 'count',
  description: 'Handles the counting game logic',
  async execute(interaction, dialogues) {
    // Determine the channel and state file path.
    const channelId = interaction.channel.id;
    const stateFilePath = path.join(process.cwd(), 'src', 'commands', 'count-state.json');

    // Load the game state from file or use defaults.
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

    // Read the number sent by the user.
    const number = parseInt(interaction.options?.getString('number') || interaction.content, 10);
    if (isNaN(number)) return;

    // If the player sends the correct next number, update normally.
    if (number === gameState.currentNumber + 1) {
      gameState.currentNumber = number;
      gameState.lastUser = interaction.user.id;
      fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
      const successMsg = (dialogues.count && dialogues.count.success)
        ? dialogues.count.success.replace('{number}', gameState.currentNumber)
        : `Great! The current number is now ${gameState.currentNumber}.`;
      return interaction.reply({ content: successMsg, flags: 64 });
    } else {
      // Decide which dialogues to use based on whether counter saver is enabled.
      const useCounterSaver = process.env.COUNTER_SAVER_ENABLED?.toLowerCase() === 'true';
      // Save the last valid number and reset immediately.
      gameState.savedValue = gameState.currentNumber;
      gameState.currentNumber = 0;
      gameState.lastUser = null;
      gameState.counterBroken = false;
      fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));

      if (useCounterSaver) {
        // When enabled, use the combined error message.
        const errorMsg = (dialogues.count && dialogues.count.error_combined)
          ? dialogues.count.error_combined.replace('{number}', gameState.savedValue)
          : `Incorrect number! Your counter has been saved at ${gameState.savedValue}. You can save it using an item from the store or start from zero. Good luck!`;
        return interaction.reply({ content: errorMsg, flags: 64 });
      } else {
        // When disabled ('blind' off), simply use error_wrong.
        const errorMsg = (dialogues.count && dialogues.count.error_wrong)
          ? dialogues.count.error_wrong
          : 'Wrong number! The counter has been reset.';
        return interaction.reply({ content: errorMsg, flags: 64 });
      }
    }
  },
};