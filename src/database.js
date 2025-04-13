import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({
    filename: './database.sqlite',
    driver: sqlite3.Database
});

(async () => {
    const db = await dbPromise;
    // Ensure the users table exists.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            guildId TEXT NOT NULL,
            userId TEXT NOT NULL,
            xp REAL DEFAULT 0,
            level INTEGER DEFAULT 1,
            messages INTEGER DEFAULT 0,
            coins REAL DEFAULT 0,
            corners INTEGER DEFAULT 0,
            PRIMARY KEY (guildId, userId)
        );
    `);
    // Create the store_items table if it doesn't exist.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS store_items (
            item_key TEXT PRIMARY KEY,
            price REAL NOT NULL,
            max_per_user INTEGER DEFAULT 1,
            name TEXT DEFAULT '',
            description TEXT DEFAULT ''
        );
    `);
    // Add new table for stream configurations.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS streams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT NOT NULL,
          streamerName TEXT NOT NULL,
          streamChannelId TEXT,
          roleId TEXT,
          announced INTEGER DEFAULT 0,
          startTime TEXT
        );
    `);
    // Attempt to add columns to store_items as before.
    try {
        await db.exec(`ALTER TABLE store_items ADD COLUMN name TEXT DEFAULT '';`);
        console.log("Added column 'name' to store_items.");
    } catch (err) {
        if (
            err.message.includes("duplicate column name") ||
            err.message.includes("already exists")
        ) {
            console.log("Column 'name' already exists, skipping.");
        } else {
            console.error("Unexpected error adding column 'name':", err);
        }
    }
    try {
        await db.exec(`ALTER TABLE store_items ADD COLUMN description TEXT DEFAULT '';`);
        console.log("Added column 'description' to store_items.");
    } catch (err) {
        if (
            err.message.includes("duplicate column name") ||
            err.message.includes("already exists")
        ) {
            console.log("Column 'description' already exists, skipping.");
        } else {
            console.error("Unexpected error adding column 'description':", err);
        }
    }
    // Insert default items if not present.
    await db.run(`
        INSERT OR IGNORE INTO store_items (item_key, price, max_per_user, name, description)
        VALUES ('counter_saver', 100, 1, 'Counter Saver', 'Resume counting from where you left off after a mistake.')
    `);
})();

export default dbPromise;