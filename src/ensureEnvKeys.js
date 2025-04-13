import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Descriptions for each key.
const keyDescriptions = {
  DISCORD_TOKEN: 'Your Discord bot token (from the Discord Developer Portal) *required*',
  CLIENT_ID: 'Your Discord application client ID',
  GUILD_ID: 'The ID of the Discord guild (server) where commands are deployed',
  TWITCH_CLIENT_ID: 'Your Twitch API client ID',
  TWITCH_CLIENT_SECRET: 'Your Twitch API secret',
  BLUESKY_USERNAME: 'Your Bluesky account username',
  BLUESKY_PASSWORD: 'Your Bluesky application password',
  COUNTER_SAVER_ENABLED: 'Flag (true/false) to enable the Counter Saver feature',
  COUNTER_SAVER_COOLDOWN_DAYS: 'Cooldown (in days) for the Counter Saver feature'
};

// Mark keys that must not be empty.
const requiredKeys = ['DISCORD_TOKEN'];

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureEnvKeys() {
  const envPath = path.join(process.cwd(), '.env');
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const keys = Object.keys(keyDescriptions);
  let updated = false;
  for (const key of keys) {
    const regex = new RegExp(`^${key}=`, 'm');
    if (!regex.test(content)) {
      let answer = "";
      // If the key is required, force non-empty input.
      if (requiredKeys.includes(key)) {
        while (!answer.trim()) {
          answer = await askQuestion(`Enter value for ${key} (${keyDescriptions[key]}): `);
          if (!answer.trim()) {
            console.log(`The key ${key} is required. Please provide a valid value.`);
          }
        }
      } else {
        answer = await askQuestion(`Enter value for ${key} (${keyDescriptions[key]}). Leave blank to skip: `);
      }
      content += `\n${key}=${answer.trim()}`;
      updated = true;
    }
  }
  if (updated) {
    fs.writeFileSync(envPath, content);
    console.log('Created/updated .env with necessary keys.');
    // Wait 2 seconds to ensure the file is fully written.
    await delay(2000);
  }
}