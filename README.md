# My Discord Bot

This is a simple Discord bot built with Node.js. It responds to commands and can be extended with additional features.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/isoura4/ISROBOT_V2.git
   ```
2. Navigate to the project directory:
   ```
   cd ISROBOT_V2
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory and add your Discord bot token:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   TWITCH_CLIENT_ID=your_twitch_client_id TWITCH_CLIENT_SECRET=your_twitch_client_secret BLUESKY_USERNAME=your_bluesky_username
   BLUESKY_PASSWORD=your_bluesky_password
   ```

## Usage

To start the bot, run the following command:
```
node bot.js
```

## Commands

- **ping**: Measures the ping between the Discord server and the bot.
!ping

- **count**: Starts a counting game where users must count in order without repeating numbers or answering twice in a row.
!count


- **bluesky**: Retrieves a Bluesky token using the credentials stored in the environment variables.
!bluesky


- **stream**: Sets up stream checking functionality for a specified platform and streamer. Only administrators can use this command.
!stream <channel_id> <platform> <streamer_name>


## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.