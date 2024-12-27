const { SlashCommandBuilder } = require('discord.js');
const { getCounter, setCounter } = require('../utils/counter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startcounter')
        .setDescription('Démarre le jeu de compteur dans le salon spécifié.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où démarrer le jeu de compteur.')
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        // Initialiser le compteur pour le salon spécifié
        setCounter(guildId, 0, null, channel.id);

        await interaction.reply(`Le jeu de compteur a été démarré dans le salon <#${channel.id}>.`);
    }
};
