const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        // Vérifier si l'utilisateur a les droits d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Vous n\'avez pas les droits nécessaires pour utiliser cette commande.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        // Initialiser le compteur pour le salon spécifié
        setCounter(guildId, 0, null, channel.id);

        await interaction.reply(`Le jeu de compteur a été démarré dans le salon <#${channel.id}>. Le compteur est à 0.`);
    }
};
