const { SlashCommandBuilder } = require('discord.js');
const { getCounter, setCounter } = require('../utils/counter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startcounter')
        .setDescription('Démarrer le jeu de compteur dans un salon spécifique.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où démarrer le jeu.')
                .setRequired(true)
                .addChannelTypes(0)), // 0 for GUILD_TEXT
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        setCounter(0, null);

        await interaction.reply(`Le jeu de compteur a démarré dans le salon <#${channel.id}>. Le compteur est à 0.`);
    },
};
