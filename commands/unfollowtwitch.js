const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unfollowtwitch')
        .setDescription('Ne plus suivre un streamer Twitch.')
        .addStringOption(option =>
            option.setName('streamer')
                .setDescription('Le nom du streamer Twitch à ne plus suivre.')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const streamer = interaction.options.getString('streamer');
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        serverConfig.servers[interaction.guildId] = serverConfig.servers[interaction.guildId] || {};
        serverConfig.servers[interaction.guildId].twitchStreamers = serverConfig.servers[interaction.guildId].twitchStreamers || [];
        serverConfig.servers[interaction.guildId].twitchStreamers = serverConfig.servers[interaction.guildId].twitchStreamers.filter(s => s !== streamer);
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));

        await interaction.reply(`Vous ne suivez plus le streamer Twitch ${streamer}.`);
    }
};