const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listchannels')
        .setDescription('Liste tous les salons du serveur.'),
    async execute(interaction) {
        // Vérifier si l'utilisateur a les droits d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Vous n\'avez pas les droits nécessaires pour utiliser cette commande.', ephemeral: true });
        }

        const channels = interaction.guild.channels.cache.filter(channel => channel.type === 0 || channel.type === 2); // 0 for text, 2 for voice
        const channelList = channels.map(channel => `- ${channel.name} (${channel.id})`).join('\n');
        await interaction.reply({ content: `Salons disponibles :\n${channelList}`, ephemeral: true });
    }
};
