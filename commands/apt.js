const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apt')
        .setDescription('Afficher un GIF spécial.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Voici votre GIF spécial !')
            .setImage('https://tenor.com/view/apt-blackpink-rose-apt-rose-mak-rose-ros%C3%A9-gif-17440988294150416254')
            .setColor('#FF69B4'); // Couleur rose pour correspondre au thème

        await interaction.reply({ embeds: [embed] });
    }
};
