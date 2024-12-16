const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Envoie un meme aléatoire.'),
    async execute(interaction) {
        try {
            const response = await fetch('https://api.imgflip.com/get_memes');
            const data = await response.json();
            const meme = data.data.memes[Math.floor(Math.random() * data.data.memes.length)];
            await interaction.reply(meme.url);
        } catch (error) {
            console.error(error);
            await interaction.reply('Désolé, je n\'ai pas pu récupérer un meme.');
        }
    }
};
