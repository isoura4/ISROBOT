import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const levelsDataFilePath = path.join(__dirname, 'data/levels.json');
const configFilePath = path.join(__dirname, 'data/levels-config.json');

// (Config is no longer used for per-message XP in this example, but we keep it if needed)
let levelConfig = { xpPerMessage: 10, xpPerLevel: 100 };
if (fs.existsSync(configFilePath)) {
    try {
        const configData = fs.readFileSync(configFilePath, 'utf8');
        levelConfig = JSON.parse(configData);
    } catch (err) {
        console.error('Error reading levels config:', err);
    }
}

/*
 XP Calculation:
   For n words in a message, XP = 60 * (1.05ⁿ - 1)
   (Because for one word, XP = 60*(1.05^1 - 1) = 60*0.05 = 3)
*/
function calculateMessageXp(messageText) {
    const words = messageText.trim().split(/\s+/).filter(word => word !== '');
    const n = words.length;
    return Math.floor(60 * (Math.pow(1.05, n) - 1));
}

/*
 Level calculation:
   - To go from level 1 → 2: need 100 XP
   - To go from level 2 → 3: need 150 XP
   - Then each next level requires 20% more XP than the previous level.
   We subtract the threshold XP as long as the user’s remaining XP meets it.
*/
function computeLevel(xp) {
    let level = 1;
    let required = 100; // XP needed to go from level 1 → 2
    while (xp >= required) {
        xp -= required;
        level++;
        required = Math.floor(required * 1.2);
    }
    return level;
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

// Now, addMessageXp expects a third parameter: the message text.
export function addMessageXp(guildId, userId, messageText) {
    const levelsData = loadLevels();
    if (!levelsData.servers[guildId]) {
        levelsData.servers[guildId] = { users: {} };
    }
    const serverData = levelsData.servers[guildId];
    if (!serverData.users[userId]) {
        serverData.users[userId] = { xp: 0, level: 1, messages: 0 };
    }
    const userData = serverData.users[userId];

    const previousLevel = userData.level;
    const xpEarned = calculateMessageXp(messageText);
    userData.xp += xpEarned;
    userData.messages += 1;

    const newLevel = computeLevel(userData.xp);
    if (newLevel > previousLevel) {
        userData.level = newLevel;
        saveLevels(levelsData);
        return newLevel; // Return new level if a level up occurred
    }
    saveLevels(levelsData);
    return null;
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
    // Sort descending by XP
    return users
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.xp - a.xp);
}

export function getLevelConfig() {
    return levelConfig;
}

export function updateLevelConfig(newConfig) {
    levelConfig = { ...levelConfig, ...newConfig };
    fs.writeFileSync(configFilePath, JSON.stringify(levelConfig, null, 2));
}

export function cumulativeXpForLevel(level) {
    // For your system:
    // Level 1 → 2: 100 XP
    // Level 2 → 3: 150 XP
    // For level 4 and onward: each level-up requirement increases by 20% (using Math.floor)
    if (level <= 1) return 0;
    let total = 0;
    if (level >= 2) {
        total += 100; // Level 2 threshold
    }
    if (level >= 3) {
        total += 150; // Level 3 threshold
        let req = 150;
        for (let i = 4; i <= level; i++) {
            req = Math.floor(req * 1.2);
            total += req;
        }
    }
    return total;
}