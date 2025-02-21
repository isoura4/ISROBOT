import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, 'data/levels.json');

const XP_PER_MESSAGE = 10; // XP awarded per message
const XP_PER_LEVEL = 100;  // XP needed for each level

function loadLevels() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    }
    return { servers: {} };
}

function saveLevels(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
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

    userData.xp += XP_PER_MESSAGE;
    userData.messages += 1;
    const newLevel = Math.floor(userData.xp / XP_PER_LEVEL) + 1;
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