const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apt')
        .setDescription('Afficher un GIF spécial.'),
    async execute(interaction) {
        const gifUrl = 'https://tenor.com/view/apt-blackpink-rose-apt-rose-mak-rose-ros%C3%A9-gif-17440988294150416254';
        await interaction.reply({ content: `Voici votre GIF spécial ! ${gifUrl}` });
    }
};
