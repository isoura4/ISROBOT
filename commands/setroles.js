const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Définit le rôle à mentionner pour les messages de Bluesky.')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à mentionner pour les messages de Bluesky.')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const role = interaction.options.getRole('role');
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        serverConfig.servers[interaction.guildId] = serverConfig.servers[interaction.guildId] || {};
        serverConfig.servers[interaction.guildId].mentionRoleId = role.id;
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));

        await interaction.reply(`Le rôle à mentionner pour les messages de Bluesky a été défini sur ${role.name}.`);
    }
};
