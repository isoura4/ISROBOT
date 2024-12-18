const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announceevent')
        .setDescription('Annoncer un événement dans un salon textuel.')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('L\'ID de l\'événement.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où l\'événement sera annoncé.')
                .setRequired(true)
                .addChannelTypes(0)), // 0 for GUILD_TEXT
    async execute(interaction) {
        const eventId = interaction.options.getString('event_id');
        const channel = interaction.options.getChannel('channel');

        // Récupérer les détails de l'événement
        const guild = interaction.guild;
        const event = guild.scheduledEvents.cache.get(eventId);

        if (!event) {
            return interaction.reply({ content: 'Événement non trouvé.', ephemeral: true });
        }

        // Créer un embed pour l'annonce
        const embed = new EmbedBuilder()
            .setTitle(event.name)
            .setDescription(event.description)
            .addFields(
                { name: 'Date', value: new Date(event.scheduledStartTimestamp).toLocaleString(), inline: true },
                { name: 'Heure de début', value: new Date(event.scheduledStartTimestamp).toLocaleTimeString(), inline: true },
                { name: 'Heure de fin', value: new Date(event.scheduledEndTimestamp).toLocaleTimeString(), inline: true },
                { name: 'Lieu', value: `<#${event.channelId}>`, inline: true }
            )
            .setImage(event.image ? event.image : null)
            .setColor(0x00ff00)
            .setTimestamp(new Date(event.scheduledStartTimestamp));

        // Envoyer l'annonce dans le salon spécifié
        await channel.send({ embeds: [embed] });
        await interaction.reply(`Événement "${event.name}" annoncé avec succès.`);
    },
};
