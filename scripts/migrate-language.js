import fs from 'fs';
import path from 'path';

const oldPath = path.join('src', 'commands', 'language-state.json');
const newPath = path.join('src', 'commands', 'guild-language.json');

if (fs.existsSync(oldPath)) {
  const oldState = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
  // Migrate to a new structure: { [guildId]: language }
  const newState = {};
  // If you only had a global language, set it as default for all guilds on first run
  newState['default'] = oldState.language || 'en';
  fs.writeFileSync(newPath, JSON.stringify(newState, null, 2));
  fs.unlinkSync(oldPath);
  console.log('Migrated language-state.json to guild-language.json');
}