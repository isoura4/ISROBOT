const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Measures the ping between the Discord server and the bot.',
    async execute(interaction) {
        const sentMessage = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const ping = sentMessage.createdTimestamp - interaction.createdTimestamp;

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Ping')
            .setDescription(`🏓 Pong! The ping is ${ping}ms.`);

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};