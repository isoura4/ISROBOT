const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Measures the ping between the Discord server and the bot.',
    async execute(message) {
        const sentMessage = await message.channel.send('Pinging...');
        const ping = sentMessage.createdTimestamp - message.createdTimestamp;

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Ping')
            .setDescription(`🏓 Pong! The ping is ${ping}ms.`);

        sentMessage.edit({ content: null, embeds: [embed] });
    },
};