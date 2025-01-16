const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Measures the ping between the Discord server and the bot.',
    async execute(interaction) {
        await interaction.reply({ content: 'Pinging...' });
        const sentMessage = await interaction.fetchReply();
        const ping = sentMessage.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Ping')
            .setDescription(`🏓 Pong! The ping is ${ping}ms.`);

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};