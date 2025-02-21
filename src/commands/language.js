import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFilePath = path.join(__dirname, 'language-state.json');
// Assume locale files are stored in a shared folder at the root: /locales
const localesFolderPath = path.join(__dirname, '../../locales');

let languageState = { language: 'en' };

function loadLanguageState() {
    if (fs.existsSync(stateFilePath)) {
        const data = fs.readFileSync(stateFilePath, 'utf8');
        languageState = JSON.parse(data);
        console.log(`Loaded language state: ${languageState.language}`);
    }
}

function saveLanguageState() {
    fs.writeFileSync(stateFilePath, JSON.stringify(languageState, null, 2));
    console.log(`Saved language state: ${languageState.language}`);
}

function loadLocale(language) {
    const filePath = path.join(localesFolderPath, `${language}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(`Error parsing locale for ${language}:`, err);
        }
    }
    return null;
}

loadLanguageState();

export default {
    name: 'language',
    description: 'Change the bot language',
    options: [
        {
            name: 'language',
            type: 3, // STRING
            description: 'The language to set (e.g., en, fr)',
            required: true,
        },
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const language = interaction.options.getString('language').toLowerCase();
        const locale = loadLocale(language);
        if (!locale) {
            return interaction.reply(`Translation for "${language}" not found. Please contribute a file to the locales folder.`);
        }

        languageState.language = language;
        saveLanguageState();
        await interaction.reply(`Language has been set to ${language}.`);
    }
};

export function getLanguageState() {
    return languageState;
}