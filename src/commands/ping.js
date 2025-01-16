const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Measures the ping between the Discord server and the bot.',
    async execute(interaction, dialogues) {
        await interaction.reply({ content: dialogues.ping.reply });
        const sentMessage = await interaction.fetchReply();
        const ping = sentMessage.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Ping')
            .setDescription(dialogues.ping.pong.replace('{ping}', ping));

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};