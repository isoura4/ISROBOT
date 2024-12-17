const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Afficher l\'état du bot.'),
    async execute(interaction) {
        await interaction.deferReply();

        const start = Date.now();
        await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bot ${interaction.client.token}`
            }
        });
        const end = Date.now();
        const responseTime = end - start;

        const embed = new EmbedBuilder()
            .setTitle('État du Bot')
            .setDescription('Informations sur l\'état actuel du bot.')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Temps de Réponse', value: `${responseTime} ms`, inline: true },
                { name: 'Utilisation de la Mémoire', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: 'Version de Node.js', value: process.version, inline: true },
                { name: 'Version de Discord.js', value: require('discord.js').version, inline: true }
            )
            .setTimestamp(new Date())
            .setFooter({ text: '© 2023 Votre Bot Discord' });

        await interaction.editReply({ embeds: [embed] });
    },
};
