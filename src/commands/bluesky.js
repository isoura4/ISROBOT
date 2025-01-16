const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'bluesky',
    description: 'Get a Bluesky token',
    async execute(message, args) {
        const username = process.env.BLUESKY_USERNAME;
        const password = process.env.BLUESKY_PASSWORD;

        if (!username || !password) {
            return message.reply('Bluesky username or password is not set in the environment variables.');
        }

        try {
            const response = await axios.post('https://api.bluesky.com/token', {
                username: username,
                password: password
            });

            const token = response.data.token;
            message.reply(`Your Bluesky token is: ${token}`);
        } catch (error) {
            console.error(error);
            message.reply('There was an error getting your Bluesky token.');
        }
    },
};