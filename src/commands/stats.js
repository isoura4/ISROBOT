import { getUserStats, getServerRanking } from '../levels.js';

export default {
    name: 'stats',
    description: 'View individual or server statistics',
    options: [
        {
            name: 'user',
            type: 6, // USER type
            description: 'The user to view stats for (optional)',
            required: false,
        },
    ],
    async execute(interaction, dialogues) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const userStats = getUserStats(guildId, targetUser.id);
        const ranking = getServerRanking(guildId);
        const userRank = ranking.findIndex(u => u.userId === targetUser.id) + 1;

        const response = [
            `Stats for **${targetUser.username}**:`,
            `Messages sent: ${userStats.messages}`,
            `Accumulated XP: ${userStats.xp}`,
            `Current level: ${userStats.level}`,
            `Server ranking: ${userRank} / ${ranking.length}`
        ].join('\n');

        await interaction.reply(response);
    },
};