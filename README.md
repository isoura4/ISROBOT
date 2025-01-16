# My Discord Bot

This is a versatile Discord bot built with Node.js. It supports various commands and can be extended with additional features. The bot is designed to enhance your Discord server with fun and useful functionalities, such as telling jokes, managing games, and integrating with external services like Twitch and Bluesky.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [License](#license)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/isoura4/ISROBOT_V2.git
   ```
2. Navigate to the project directory:
   ```bash
   cd ISROBOT_V2
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory and add your environment variables:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
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

## Commands

- **/ping**: Measures the ping between the Discord server and the bot.
- **/count**: Starts a counting game where users must count in order without repeating numbers or answering twice in a row.
- **/stream**: Sets up stream checking functionality for a specified platform and streamer. Only administrators can use this command.
- **/joke**: Tells a random joke to lighten the mood in the server.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.