const { SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteevent')
        .setDescription('Supprimer un événement de serveur.')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('L\'ID de l\'événement.')
                .setRequired(true)),
    async execute(interaction) {
        const eventId = interaction.options.getString('event_id');

        const rest = new REST({ version: '9' }).setToken(config.token);

        try {
            await rest.delete(Routes.guildScheduledEvent(interaction.guildId, eventId));

            await interaction.reply(`Événement supprimé avec succès.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Il y a eu une erreur en essayant de supprimer l\'événement.', ephemeral: true });
        }
    },
};