import fetch from 'node-fetch';
import pkg from '../package.json' assert { type: 'json' };

const TELEMETRY_URL = process.env.TELEMETRY_URL || 'https://your-telemetry-endpoint.example.com/collect';
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED !== 'false'; // default: enabled

export async function sendTelemetry(client) {
  if (!TELEMETRY_ENABLED) return;

  try {
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot: 'ISROBOT',
        version: pkg.version,
        guildCount,
        userCount,
        timestamp: Date.now(),
        instanceId: process.env.INSTANCE_ID || undefined // optional: for multi-instance
      })
    });
    // Optionally, log success
    // console.log('Telemetry sent');
  } catch (err) {
    // Fail silently, do not block bot
    // console.warn('Telemetry failed:', err.message);
  }
}