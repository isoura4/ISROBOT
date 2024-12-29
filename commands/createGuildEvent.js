const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createevent')
        .setDescription('Créer un nouvel événement de serveur.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Le nom de l\'événement.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('La description de l\'événement.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('La date de l\'événement (format YYYY-MM-DD).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('start_time')
                .setDescription('L\'heure de début de l\'événement (format HH:MM).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('end_time')
                .setDescription('L\'heure de fin de l\'événement (format HH:MM).')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où l\'événement aura lieu.')
                .setRequired(true)
                .addChannelTypes([2, 13])) // 2 for GUILD_VOICE, 13 for GUILD_STAGE_VOICE
        .addStringOption(option =>
            option.setName('image')
                .setDescription('L\'URL de l\'image de couverture de l\'événement.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('frequency')
                .setDescription('La fréquence de l\'événement (ONE_TIME, WEEKLY, etc.).')
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

        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const date = interaction.options.getString('date');
        const startTime = interaction.options.getString('start_time');
        const endTime = interaction.options.getString('end_time');
        const channel = interaction.options.getChannel('channel');
        const image = interaction.options.getString('image');
        const frequency = interaction.options.getString('frequency') || 'ONE_TIME';

        let entity_type;
        let entity_metadata = {};
        if (channel.type === 2) {
            entity_type = 2; // Voice event
        } else if (channel.type === 13) {
            entity_type = 2; // Stage event
            entity_metadata = {
                location: 'Somewhere' // You can customize this field
            };
        } else {
            return interaction.reply({ content: 'Le salon spécifié doit être un salon vocal ou un salon de scène.', ephemeral: true });
        }

        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = new Date(`${date}T${endTime}:00`);

        if (startDateTime <= new Date()) {
            return interaction.reply({ content: 'L\'heure de début de l\'événement doit être dans le futur.', ephemeral: true });
        }

        const rest = new REST({ version: '9' }).setToken(config.token);

        try {
            const response = await rest.post(Routes.guildScheduledEvents(interaction.guildId), {
                body: {
                    name,
                    description,
                    scheduled_start_time: startDateTime.toISOString(),
                    scheduled_end_time: endDateTime.toISOString(),
                    entity_type, // Use the determined entity_type
                    channel_id: channel.id,
                    privacy_level: 2, // 2 corresponds to a guild-only event
                    ...(entity_type === 2 && channel.type === 13 ? { entity_metadata } : {}), // Include entity_metadata only for stage events
                    image,
                    recurring_frequency: frequency
                }
            });

            await interaction.reply(`Événement "${name}" créé avec succès.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Il y a eu une erreur en essayant de créer l\'événement.', ephemeral: true });
        }
    },
};
