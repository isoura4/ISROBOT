const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('followtwitch')
        .setDescription('Suivre un streamer Twitch.')
        .addStringOption(option =>
            option.setName('streamer')
                .setDescription('Le nom du streamer Twitch à suivre.')
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
        if (!serverConfig.servers[interaction.guildId].twitchStreamers.includes(streamer)) {
            serverConfig.servers[interaction.guildId].twitchStreamers.push(streamer);
            fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
            await interaction.reply(`Vous suivez maintenant le streamer Twitch ${streamer}.`);
        } else {
            await interaction.reply(`Vous suivez déjà le streamer Twitch ${streamer}.`);
        }
    }
};
