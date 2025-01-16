const fs = require('fs');
const path = require('path');

let gameState = {
    currentNumber: 0,
    lastUser: null,
    gameChannelId: null
};

const stateFilePath = path.join(__dirname, 'count-state.json');

// Load the game state from the file
function loadGameState() {
    if (fs.existsSync(stateFilePath)) {
        const data = fs.readFileSync(stateFilePath, 'utf8');
        gameState = JSON.parse(data);
    }
}

// Save the game state to the file
function saveGameState() {
    fs.writeFileSync(stateFilePath, JSON.stringify(gameState, null, 2));
}

loadGameState();

module.exports = {
    name: 'count',
    description: 'Start the counting game',
    options: [
        {
            name: 'channel',
            type: 7, // CHANNEL
            description: 'The channel where the counting game will take place',
            required: true,
        },
    ],
    async execute(interaction, dialogues) {
        const channel = interaction.options.getChannel('channel');

        gameState.gameChannelId = channel.id;
        gameState.currentNumber = 0;
        gameState.lastUser = null;
        saveGameState(); // Save the game state after setting the channel
        await interaction.reply(dialogues.count.start.replace('{channelId}', gameState.gameChannelId));
    }
};