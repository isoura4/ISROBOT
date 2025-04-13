import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Force reload of .env by overriding existing values.
dotenv.config({ override: true });

export default {
  name: 'reload',
  description: 'Reload bot parameters and reinitialize the database connection (Admin only)',
  async execute(interaction, dialogues) {
    // Only allow administrators to use this command.
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: dialogues.store.no_permission || 'You do not have permission.',
        ephemeral: true
      });
    }

    // Reload environment variables with override.
    dotenv.config({ override: true });
    
    // Reload language state.
    const languageStateFilePath = path.join(process.cwd(), 'src', 'commands', 'language-state.json');
    let languageState = { language: 'en' };
    if (fs.existsSync(languageStateFilePath)) {
      try {
        const data = fs.readFileSync(languageStateFilePath, 'utf8');
        languageState = JSON.parse(data);
        console.log(`Reloaded language state: ${languageState.language}`);
      } catch (err) {
        console.error("Error reloading language state:", err);
      }
    }
    // Reload locale dialogues.
    const localesFolderPath = path.join(process.cwd(), 'locales');
    function loadDialogues(language) {
      const filePath = path.join(localesFolderPath, `${language}.json`);
      if (fs.existsSync(filePath)) {
        try {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
          console.error(`Error reading locale file for ${language}:`, err);
          return {};
        }
      } else {
        console.warn(`Locale file for ${language} not found. Falling back to English.`);
        const fallbackPath = path.join(localesFolderPath, 'en.json');
        return fs.existsSync(fallbackPath) ? JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) : {};
      }
    }
    const newDialogues = loadDialogues(languageState.language);

    // Reload database by performing a simple test query.
    try {
      const db = await import('../database.js').then(module => module.default);
      // Test query (for example, count rows in users table).
      const result = await db.get("SELECT count(*) AS count FROM users");
      console.log(`Database reloaded. User count: ${result.count}`);
    } catch (dbErr) {
      console.error("Error reloading database:", dbErr);
      return interaction.reply({ content: "Error reloading database.", flags: 64 });
    }

    return interaction.reply({
      content: `Bot parameters and database reloaded. Current language is "${languageState.language}".`,
      flags: 64
    });
  },
};