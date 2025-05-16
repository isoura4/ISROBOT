import fs from 'fs';
import path from 'path';
import readline from 'readline';

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

const requiredKeys = ['DISCORD_TOKEN','CLIENT_ID', 'GUILD_ID'];
const optionalKeys = [
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
  'BLUESKY_USERNAME',
  'BLUESKY_PASSWORD',
  'COUNTER_SAVER_ENABLED',
  'COUNTER_SAVER_COOLDOWN_DAYS'
];

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

export async function ensureEnvKeys() {
  const envPath = path.join(process.cwd(), '.env');
  let env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const [key, ...rest] = line.split('=');
      env[key.trim()] = rest.join('=').trim();
    }
  }

  let updated = false;
  for (const key of Object.keys(keyDescriptions)) {
    if (!env[key] || env[key] === '') {
      let answer = '';
      while (requiredKeys.includes(key) && !answer) {
        answer = await askQuestion(`Enter value for ${key} (${keyDescriptions[key]}): `);
        if (!answer && requiredKeys.includes(key)) {
          console.log(`${key} is required.`);
        }
      }
      if (!answer && !requiredKeys.includes(key)) {
        answer = '';
      }
      env[key] = answer;
      updated = true;
    }
  }

  if (updated) {
    const content = Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fs.writeFileSync(envPath, content);
    console.log('.env file created/updated.');
  }
}