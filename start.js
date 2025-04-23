import { ensureEnvKeys } from './src/ensureEnvKeys.js';

await ensureEnvKeys(); // This will prompt and create .env if needed

// Now start the bot
import('./bot.js');