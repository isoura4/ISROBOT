const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rick')
        .setDescription('Afficher un GIF spécial.'),
    async execute(interaction) {
        const gifUrl = 'https://tenor.com/view/rick-roll-rick-ashley-never-gonna-give-you-up-gif-22113173';
        await interaction.reply({ content: `Voici votre GIF spécial ! ${gifUrl}` });
    }
};
