const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listchannels')
        .setDescription('Liste tous les salons du serveur.'),
    async execute(interaction) {
        const channels = interaction.guild.channels.cache.filter(channel => channel.type === 0 || channel.type === 2); // 0 for text, 2 for voice
        const channelList = channels.map(channel => `- ${channel.name} (${channel.id})`).join('\n');
        await interaction.reply({ content: `Salons disponibles :\n${channelList}`, ephemeral: true });
    }
};
