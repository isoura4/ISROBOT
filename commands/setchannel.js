const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Définit le salon où les messages de Bluesky seront postés.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où les messages de Bluesky seront postés.')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const channel = interaction.options.getChannel('channel');
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        config.blueskyChannelId = channel.id;
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

        await interaction.reply(`Le salon pour les messages de Bluesky a été défini sur ${channel}.`);
    }
};
