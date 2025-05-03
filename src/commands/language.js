import fs from 'fs';
import path from 'path';

const stateFilePath = path.join('src', 'commands', 'guild-language.json');

function getGuildLanguage(guildId) {
  if (!fs.existsSync(stateFilePath)) return 'en';
  const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  return state[guildId] || state['default'] || 'en';
}

function setGuildLanguage(guildId, language) {
  let state = {};
  if (fs.existsSync(stateFilePath)) {
    state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  }
  state[guildId] = language;
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

export default {
  name: 'language',
  description: 'Change the bot language for this server',
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
    // Check if translation file exists
    if (!fs.existsSync(path.join('locales', language, 'translation.json'))) {
      return interaction.reply(`Translation for "${language}" not found. Please contribute a file to the locales folder.`);
    }
    setGuildLanguage(interaction.guild.id, language);
    await interaction.reply(`Language for this server has been set to ${language}.`);
  }
};

export function getGuildLanguageFor(guildId) {
  return getGuildLanguage(guildId);
}