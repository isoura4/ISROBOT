const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settwitchchannel')
        .setDescription('Définit le salon où les annonces Twitch seront postées.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où les annonces Twitch seront postées.')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Vérifier si l'utilisateur a les droits d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Vous n\'avez pas les droits nécessaires pour utiliser cette commande.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        serverConfig.servers[interaction.guildId] = serverConfig.servers[interaction.guildId] || {};
        serverConfig.servers[interaction.guildId].twitchAnnounceChannelId = channel.id;
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));

        await interaction.reply(`Le salon pour les annonces Twitch a été défini sur ${channel}.`);
    }
};
