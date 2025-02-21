import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const levelsDataFilePath = path.join(__dirname, 'data/levels.json');
const configFilePath = path.join(__dirname, 'data/levels-config.json');

// Load leveling config or use defaults
let levelConfig = { xpPerMessage: 10, xpPerLevel: 100 };
if (fs.existsSync(configFilePath)) {
    try {
        const configData = fs.readFileSync(configFilePath, 'utf8');
        levelConfig = JSON.parse(configData);
    } catch (err) {
        console.error('Error reading levels config:', err);
    }
}

function loadLevels() {
    if (fs.existsSync(levelsDataFilePath)) {
        const data = fs.readFileSync(levelsDataFilePath, 'utf8');
        return JSON.parse(data);
    }
    return { servers: {} };
}

function saveLevels(data) {
    fs.writeFileSync(levelsDataFilePath, JSON.stringify(data, null, 2));
}

export function addMessageXp(guildId, userId) {
    const levelsData = loadLevels();
    if (!levelsData.servers[guildId]) {
        levelsData.servers[guildId] = { users: {} };
    }
    const serverData = levelsData.servers[guildId];
    if (!serverData.users[userId]) {
        serverData.users[userId] = { xp: 0, level: 1, messages: 0 };
    }
    const userData = serverData.users[userId];

    userData.xp += levelConfig.xpPerMessage;
    userData.messages += 1;
    const newLevel = Math.floor(userData.xp / levelConfig.xpPerLevel) + 1;
    if (newLevel > userData.level) {
        console.log(`User ${userId} leveled up to level ${newLevel}!`);
        userData.level = newLevel;
    }
    saveLevels(levelsData);
}

export function getUserStats(guildId, userId) {
    const levelsData = loadLevels();
    if (levelsData.servers[guildId] && levelsData.servers[guildId].users[userId]) {
        return levelsData.servers[guildId].users[userId];
    }
    return { xp: 0, level: 1, messages: 0 };
}

export function getServerRanking(guildId) {
    const levelsData = loadLevels();
    if (!levelsData.servers[guildId]) return [];
    const users = Object.entries(levelsData.servers[guildId].users);
    // sort descending by XP
    return users
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.xp - a.xp);
}

// Export the config so new commands can report settings
export function getLevelConfig() {
    return levelConfig;
}

// Allow updating the config file externally
export function updateLevelConfig(newConfig) {
    levelConfig = { ...levelConfig, ...newConfig };
    fs.writeFileSync(configFilePath, JSON.stringify(levelConfig, null, 2));
}