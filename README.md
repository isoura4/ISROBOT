# ISROBOT

ISROBOT is a versatile Discord bot built with Node.js. This bot adds fun and useful functionalities to your Discord server – from playing games and displaying stats to integrating with external services like Twitch and Bluesky.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Environment Variables](#environment-variables)
- [License](#license)

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
   Create a `.env` file in the root directory and add your environment variables:
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

To start the bot, run the following command:

```bash
npm start
```

The bot will also deploy slash commands before it starts.

## Commands

The following slash commands are available:

- **/ping**: Measures the ping between the Discord server and the bot.
- **/joke**: Tells a random joke.
- **/count**: Starts a counting game where users must count sequentially without repeating or consecutive responses.
- **/disable-count**: Disables the counting mini-game.
- **/stats**: Displays individual or server-wide statistics.
- **/stream**: Sets up stream or post checking functionality for Twitch or Bluesky. *Admin only.*
- **/disable-twitch**: Disables Twitch stream notifications. *Admin only.*
- **/disable-bluesky**: Disables Bluesky post notifications. *Admin only.*
- **/language**: Changes the bot language (English or French). *Admin only.*

## Environment Variables

The bot requires the following environment variables to be set in your `.env` file:

- `DISCORD_TOKEN`: Your Discord bot token.
- `CLIENT_ID`: Your Discord client ID.
- `GUILD_ID`: Your Discord guild (server) ID.
- `TWITCH_CLIENT_ID`: Your Twitch client ID.
- `TWITCH_CLIENT_SECRET`: Your Twitch client secret.
- `BLUESKY_USERNAME`: Your Bluesky username.
- `BLUESKY_PASSWORD`: Your Bluesky password.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
