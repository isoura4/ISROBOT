# ISROBOT

ISROBOT is a versatile Discord bot built with Node.js. It brings music playback, games, XP/leveling, stream notifications, multi-language support, and more to your server.

---

## Features

- 🎵 **Music Playback**: Play and queue music from YouTube and other sources, with queue management and auto-disconnect.
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

3. **Install yt-dlp and ffmpeg (for music):**
   - On Linux:
     ```bash
     pip install -U yt-dlp
     sudo apt install ffmpeg
     ```
   - Or download the [yt-dlp binary](https://github.com/yt-dlp/yt-dlp/releases/latest) and place it in your project.

4. **Configure your environment:**
   - Copy `.env.example` to `.env` and fill in your tokens:
     ```
     DISCORD_TOKEN=your_discord_token
     CLIENT_ID=your_discord_client_id
     GUILD_ID=your_guild_id
     TWITCH_CLIENT_ID=your_twitch_client_id
     TWITCH_CLIENT_SECRET=your_twitch_client_secret
     BLUESKY_USERNAME=your_bluesky_username
     BLUESKY_PASSWORD=your_bluesky_password
     ```

---

## Usage

Start the bot with:
```bash
npm start
```
This will deploy slash commands and launch the bot.

---

## Music Commands

- `/play <url>` — Play or queue a song from YouTube or direct URL.
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

---

## Language Support

- English and French included.
- Add more languages by creating a new file in `/locales` (e.g., `es.json`).
- Change language with `/language`.

---

## Data & Persistence

- All user data is stored in `database.sqlite` (SQLite).
- XP, levels, coins, and store purchases are persistent.
- Old JSON data is auto-migrated on first run.

---

## Requirements

- Node.js v18+ recommended
- Python 3 (for yt-dlp, if not using the binary)
- ffmpeg

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
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [discord-player](https://github.com/discord-player/discord-player)
- [sqlite](https://www.sqlite.org/)