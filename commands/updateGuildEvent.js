const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updateevent')
        .setDescription('Mettre à jour un événement de serveur.')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('L\'ID de l\'événement.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Le nouveau nom de l\'événement.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('La nouvelle description de l\'événement.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('start_time')
                .setDescription('La nouvelle heure de début de l\'événement (format ISO 8601).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('end_time')
                .setDescription('La nouvelle heure de fin de l\'événement (format ISO 8601).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('La nouvelle URL de l\'image de couverture de l\'événement.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('frequency')
                .setDescription('La nouvelle fréquence de l\'événement (ONE_TIME, WEEKLY, etc.).')
                .setRequired(false)
                .addChoices(
                    { name: 'One Time', value: 'ONE_TIME' },
                    { name: 'Weekly', value: 'WEEKLY' },
                    { name: 'Daily', value: 'DAILY' }
                )),
    async execute(interaction) {
        // Vérifier si l'utilisateur a les droits d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Vous n\'avez pas les droits nécessaires pour utiliser cette commande.', ephemeral: true });
        }

        const eventId = interaction.options.getString('event_id');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const startTime = interaction.options.getString('start_time');
        const endTime = interaction.options.getString('end_time');
        const image = interaction.options.getString('image');
        const frequency = interaction.options.getString('frequency');

        const rest = new REST({ version: '9' }).setToken(config.token);

        const body = {};
        if (name) body.name = name;
        if (description) body.description = description;
        if (startTime) body.scheduled_start_time = startTime;
        if (endTime) body.scheduled_end_time = endTime;
        if (image) body.image = image;
        if (frequency) body.recurring_frequency = frequency;

        try {
            await rest.patch(Routes.guildScheduledEvent(interaction.guildId, eventId), {
                body
            });

            await interaction.reply(`Événement "${name || 'cet événement'}" mis à jour avec succès.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Il y a eu une erreur en essayant de mettre à jour l\'événement.', ephemeral: true });
        }
    },
};
