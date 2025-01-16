const axios = require('axios');

module.exports = {
    name: 'joke',
    description: 'Tells a random joke',
    async execute(interaction) {
        try {
            const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
            const joke = response.data;

            await interaction.reply(`${joke.setup} - ${joke.punchline}`);
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error fetching a joke.');
        }
    },
};