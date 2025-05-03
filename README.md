# ISROBOT

ISROBOT is a versatile Discord bot built with Node.js. It brings music playback, games, XP/leveling, stream notifications, multi-language support, and more to your server.

---

## Features

- 🎵 **Music Playback**: Play and queue music from YouTube, with queue management and auto-disconnect.
- 🌍 **Multi-language**: Fully adaptive to English and French (add more via `/locales`).
- 🏆 **XP & Leveling**: Earn XP and coins by chatting and being in voice channels.
- 📈 **Stats**: View your stats or server-wide rankings.
- 🎲 **Games**: Counting game, coin flip, and random jokes.
- 📢 **Stream Notifications**: Get notified for Twitch and Bluesky streams/posts.
- 🛒 **Store**: Spend coins on special items (like Counter Saver).
- 🗃️ **SQLite Database**: Persistent storage for all user data.
- 🔄 **Admin Tools**: Change language, reload config, and more.

---

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/isoura4/ISROBOT.git
   cd ISROBOT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **No system ffmpeg required!**
   - The bot uses [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static), which bundles ffmpeg for all platforms.

---

## First Launch: Automatic Environment Setup

When you start the bot for the first time, it will **automatically create a `.env` file** if one does not exist.

- The bot will prompt you in the terminal for all required configuration values (Discord token, client ID, etc.).
- Your answers will be saved to `.env` for future runs.

---

## Usage

Start the bot with:
```bash
npm start
```
This will deploy slash commands and launch the bot.

---

## Music Commands

- `/play <url>` — Play or queue a song from YouTube.
- `/queue` — Show the current music queue.
- `/nowplaying` — Show the currently playing song.
- `/stop` — Stop playback and clear the queue.

*The bot will auto-disconnect after 10 minutes of inactivity.*

---

## Other Commands

- `/ping` — Check bot latency.
- `/joke` — Get a random joke.
- `/count` — Counting game.
- `/coinflip` — Flip a coin.
- `/stats` — View your or server stats.
- `/language <en|fr>` — Change the bot language (admin only).
- `/stream` — Set up Twitch/Bluesky notifications (admin only).
- `/store` — Buy items with coins (admin only).
- `/reload` — Reload config and database (admin only).
- `/help` — Show help for all commands.

---

## Language System

- Uses [i18next](https://www.i18next.com/) for robust, scalable internationalization.
- Per-server language support: each server can set its own language with `/language`.
- Add new languages by creating `locales/<lang>/translation.json`.
- Pluralization, interpolation, and fallbacks supported.
- Missing keys are logged for easy translation maintenance.
- To contribute a translation, copy `locales/en/translation.json` to your language code and translate the values.

---

## Data & Persistence

- All user data is stored in `database.sqlite` (SQLite).
- XP, levels, coins, and store purchases are persistent.
- Old JSON data is auto-migrated on first run.

---

## Stability & Production Features

- Global error and signal handling
- Per-command/user cooldowns (anti-spam)
- Health check endpoint (`/health`)
- Environment variable validation (`envalid`)
- Database keepalive and graceful shutdown
- Input validation and sanitization (`validator`)
- Structured logging (`winston`)
- Optional: Error tracking (`Sentry`)
- `/help` command for users

---

## Dependencies

**Node.js packages (install with `npm install`):**
- `discord.js`
- `@discordjs/voice`
- `@discordjs/opus`
- `@distube/ytdl-core`
- `ffmpeg-static`
- `dotenv`
- `sqlite`
- `sqlite3`
- `axios`
- `node-fetch`
- `opusscript`
- `winston`
- `envalid`
- `validator`
- `@sentry/node` (optional)

**System requirements:**
- Node.js v18 or newer

---

## License

This project is licensed under the GNU GPL v3.  
See [LICENSE](LICENSE) for details.

---

## Contributing

Pull requests and translations are welcome!  
For issues or suggestions, open a GitHub issue.

---

## Credits

- [discord.js](https://discord.js.org/)
- [@distube/ytdl-core](https://www.npmjs.com/package/@distube/ytdl-core)
- [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)
- [winston](https://www.npmjs.com/package/winston)
- [envalid](https://www.npmjs.com/package/envalid)
- [validator](https://www.npmjs.com/package/validator)
- [sqlite](https://www.sqlite.org/)