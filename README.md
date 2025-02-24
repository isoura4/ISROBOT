# ISROBOT

ISROBOT is a versatile Discord bot built with Node.js that adds fun and practical functionalities to your server. It features games, stats, stream notifications (Twitch & Bluesky), language switching, and a leveling system with XP and virtual currency (coins). The bot now uses SQLite for persistence and supports data migration from a JSON file.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Leveling & Currency System](#leveling--currency-system)
- [Environment Variables](#environment-variables)
- [Data Migration](#data-migration)
- [License](#license)

## Features

- **Ping & Joke**: Check bot latency and get a random joke.
- **Counting Game**: A mini-game where players count sequentially.
- **Stream Notifications**: Set up live Twitch or Bluesky notifications.
- **Language Support**: Switch between English and French.
- **XP and Leveling System**: Earn XP by sending messages and participating in voice channels. Levels require increasing XP thresholds, and leveling up awards coins.
- **SQLite Integration**: All user progress is now stored in a SQLite database for efficient scaling and persistence.
- **Automatic Data Migration**: If previous levels data is stored in a JSON file, it is automatically migrated into the database.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/isoura4/ISROBOT.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd ISROBOT
   ```

3. **Install the dependencies:**
   ```bash
   npm install
   ```

4. **Configure your environment:**  
   Create a `.env` file in the root directory and add your environment variables. For example:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here
   TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret
   BLUESKY_USERNAME=your_bluesky_username
   BLUESKY_PASSWORD=your_bluesky_password
   ```

## Usage

To start the bot, run:

```bash
npm start
```

This command deploys the latest slash commands and starts the bot.

## Commands

The following slash commands are available:

- **/ping**: Measure the latency between Discord and the bot.
- **/joke**: Get a random joke.
- **/count**: Start a counting game in a selected channel.
- **/disable-count**: Disable the counting mini-game.
- **/stats**: View your own or server-wide XP, level, messages, and coins.
- **/stream**: Configure stream notifications for Twitch or Bluesky (Admin only).
- **/disable-twitch**: Disable Twitch notifications (Admin only).
- **/disable-bluesky**: Disable Bluesky notifications (Admin only).
- **/language**: Change the bot language between English and French (Admin only).

## Leveling & Currency System

- **XP Gain per Message:**  
  The first word in a message earns **3 XP**, and each subsequent word earns **15% more XP** than the previous one. The sum is rounded to two decimal places.

- **Voice XP:**  
  Users receive **0.5 XP** per hour for being in a voice channel.

- **Level Up Thresholds:**  
  - Level 2 requires **100 XP**  
  - Each new level requires **30% more XP** than the previous increment.  
    Example: Level 3 requires 100 + (100 × 0.3) = 130 additional XP (Total: 230 XP).

- **Coin Rewards:**  
  Every time a user levels up, they earn coins (10 coins per level gained) that can later be used in your store.

## Environment Variables

Ensure your `.env` file includes the following:

- `DISCORD_TOKEN`: Your Discord bot token.
- `CLIENT_ID`: Your Discord client ID.
- `GUILD_ID`: Your Discord guild (server) ID.
- `TWITCH_CLIENT_ID`: Your Twitch client ID.
- `TWITCH_CLIENT_SECRET`: Your Twitch client secret.
- `BLUESKY_USERNAME`: Your Bluesky username.
- `BLUESKY_PASSWORD`: Your Bluesky password.

## Data Migration

If a `levels.json` file exists in `src/data`, the bot will automatically migrate your existing XP, level, and messages data into the SQLite database on startup. After a successful migration, the JSON file is removed to prevent duplicate migrations.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.