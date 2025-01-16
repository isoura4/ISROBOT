const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'bluesky',
    description: 'Get a Bluesky token',
    async execute(interaction) {
        const username = process.env.BLUESKY_USERNAME;
        const password = process.env.BLUESKY_PASSWORD;

        if (!username || !password) {
            return interaction.reply('Bluesky username or password is not set in the environment variables.');
        }

        try {
            const response = await axios.post('https://api.bluesky.com/token', {
                username: username,
                password: password
            });

            const token = response.data.token;
            await interaction.reply(`Your Bluesky token is: ${token}`);
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error getting your Bluesky token.');
        }
    },
};