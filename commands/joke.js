const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Raconte une blague aléatoire.'),
    async execute(interaction) {
        try {
            const response = await fetch('https://official-joke-api.appspot.com/random_joke');
            const data = await response.json();
            await interaction.reply(`${data.setup}\n${data.punchline}`);
        } catch (error) {
            console.error(error);
            await interaction.reply('Désolé, je n\'ai pas pu récupérer une blague.');
        }
    }
};
