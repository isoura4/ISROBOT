const fs = require('fs');
const path = require('path');

const stateFilePath = path.join(__dirname, 'language-state.json');

let languageState = {
    language: 'en'
};

// Load the language state from the file
function loadLanguageState() {
    if (fs.existsSync(stateFilePath)) {
        const data = fs.readFileSync(stateFilePath, 'utf8');
        languageState = JSON.parse(data);
        console.log(`Loaded language state: ${languageState.language}`);
    }
}

// Save the language state to the file
function saveLanguageState() {
    fs.writeFileSync(stateFilePath, JSON.stringify(languageState, null, 2));
    console.log(`Saved language state: ${languageState.language}`);
}

loadLanguageState();

module.exports = {
    name: 'language',
    description: 'Change the bot language',
    options: [
        {
            name: 'language',
            type: 3, // STRING
            description: 'The language to set (en or fr)',
            required: true,
        },
    ],
    async execute(interaction) {
        const language = interaction.options.getString('language').toLowerCase();

        if (language !== 'en' && language !== 'fr') {
            return interaction.reply('Invalid language. Please choose either "en" or "fr".');
        }

        languageState.language = language;
        saveLanguageState();

        // Reload the language state
        loadLanguageState();

        await interaction.reply(`Language has been set to ${language}.`);
    }
};