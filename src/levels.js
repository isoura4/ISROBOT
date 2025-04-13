//// filepath: /c:/Users/ISOURA/Documents/GitHub/ISROBOT_V2/src/levels.js
import fs from 'fs';
import path from 'path';
import dbPromise from './database.js';

// Run migration if levels.json exists
(async function migrateLevels() {
    const levelsFile = path.join(process.cwd(), 'src', 'data', 'levels.json');
    if (!fs.existsSync(levelsFile)) {
        console.log('No levels.json file found, skipping migration.');
        return;
    }
    console.log('Migrating data from levels.json into SQLite...');
    try {
        const data = fs.readFileSync(levelsFile, 'utf8');
        const levelsData = JSON.parse(data);
        for (const guildId in levelsData.servers) {
            const users = levelsData.servers[guildId].users;
            for (const userId in users) {
                const userData = users[userId];
                const db = await dbPromise;
                // Check if the user data already exists.
                const existing = await db.get(
                    'SELECT * FROM users WHERE guildId = ? AND userId = ?',
                    guildId,
                    userId
                );
                if (existing) {
                    // Update with data from levels.json.
                    await db.run(
                        `UPDATE users 
                         SET xp = ?, level = ?, messages = ? 
                         WHERE guildId = ? AND userId = ?`,
                        parseFloat(userData.xp.toFixed(2)),
                        userData.level,
                        userData.messages,
                        guildId,
                        userId
                    );
                } else {
                    // Insert new row.
                    await db.run(
                        'INSERT INTO users (guildId, userId, xp, level, messages) VALUES (?, ?, ?, ?, ?)',
                        guildId,
                        userId,
                        parseFloat(userData.xp.toFixed(2)),
                        userData.level,
                        userData.messages
                    );
                }
            }
        }
        console.log('Migration from levels.json completed.');
        // Optionally remove levels.json after migration.
        fs.unlinkSync(levelsFile);
    } catch (error) {
        console.error('Error during levels.json migration:', error);
    }
})();

function computeXpForMessage(messageText) {
    const words = messageText.trim().split(/\s+/).filter(w => w.length > 0);
    const n = words.length;
    if (n === 0) return 0;
    const r = 1.15; // 15% more xp for each subsequent word.
    const xp = 3 * ((Math.pow(r, n) - 1) / (r - 1));
    return parseFloat(xp.toFixed(2)); // Round to two decimals
}

/**
 * Computes the level based on cumulative XP.
 * Level 1 starts at 0 XP.
 * For level 2, the threshold is 100 XP.
 * For each subsequent level, the XP increment is multiplied by 1.3.
 */
export function computeLevel(xp) {
    let level = 1;
    let threshold = 0;
    let increment = 100;
    while (xp >= threshold + increment) {
        threshold += increment;
        increment *= 1.3;
        level++;
    }
    return level;
}

/**
 * Returns the cumulative XP threshold for a given level.
 * For level 1, threshold is 0.
 * Level 2 threshold is 100 XP.
 * Level 3 threshold is 100 + (100*1.3), and so on.
 */
export function cumulativeXpForLevel(level) {
    if (level <= 1) return 0;
    let threshold = 0;
    let increment = 100;
    for (let i = 2; i <= level; i++) {
        threshold += increment;
        increment *= 1.3;
    }
    return threshold;
}

// Award XP for a new message.
export async function addMessageXp(guildId, userId, messageText) {
    const db = await dbPromise;
    let userData = await db.get(
        'SELECT * FROM users WHERE guildId = ? AND userId = ?',
        guildId, userId
    );
    if (!userData) {
        await db.run(
            'INSERT INTO users (guildId, userId) VALUES (?, ?)',
            guildId, userId
        );
        userData = await db.get(
            'SELECT * FROM users WHERE guildId = ? AND userId = ?',
            guildId, userId
        );
    }

    const xpEarned = computeXpForMessage(messageText);
    const newXp = parseFloat((userData.xp + xpEarned).toFixed(2));
    const previousLevel = userData.level;
    const newLevel = computeLevel(newXp);
    let coinsAwarded = 0;

    if (newLevel > previousLevel) {
        coinsAwarded = (newLevel - previousLevel) * 10;
    }

    await db.run(
        `UPDATE users 
         SET xp = ?, level = ?, messages = messages + 1, coins = coins + ? 
         WHERE guildId = ? AND userId = ?`,
        newXp,
        newLevel,
        coinsAwarded,
        guildId,
        userId
    );

    return newLevel > previousLevel ? newLevel : null;
}

// Award XP for being in voice chat.
export async function addVoiceXp(guildId, userId) {
    const db = await dbPromise;
    let userData = await db.get(
        'SELECT * FROM users WHERE guildId = ? AND userId = ?',
        guildId, userId
    );
    if (!userData) {
        await db.run(
            'INSERT INTO users (guildId, userId) VALUES (?, ?)',
            guildId, userId
        );
        userData = await db.get(
            'SELECT * FROM users WHERE guildId = ? AND userId = ?',
            guildId, userId
        );
    }

    const xpEarned = 0.5; // Award 0.5 XP per hour in voice chat.
    const newXp = parseFloat((userData.xp + xpEarned).toFixed(2));
    const previousLevel = userData.level;
    const newLevel = computeLevel(newXp);
    let coinsAwarded = 0;

    if (newLevel > previousLevel) {
        coinsAwarded = (newLevel - previousLevel) * 10;
    }

    await db.run(
        `UPDATE users 
         SET xp = ?, level = ?, coins = coins + ? 
         WHERE guildId = ? AND userId = ?`,
        newXp,
        newLevel,
        coinsAwarded,
        guildId,
        userId
    );

    return newLevel > previousLevel ? newLevel : null;
}

export async function getUserStats(guildId, userId) {
    const db = await dbPromise;
    let userData = await db.get(
        'SELECT * FROM users WHERE guildId = ? AND userId = ?',
        guildId, userId
    );
    if (!userData) {
        return { xp: 0, level: 1, messages: 0, coins: 0 };
    }
    return userData;
}

export async function getServerRanking(guildId) {
    const db = await dbPromise;
    const users = await db.all(
        'SELECT * FROM users WHERE guildId = ?',
        guildId
    );
    return users.sort((a, b) => b.xp - a.xp);
}