import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function getLanguageState() {
    return languageState;
}

export default {
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
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

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