import { getUserStats, getServerRanking, getLevelConfig } from '../levels.js';

export default {
    name: 'stats',
    description: 'View individual or server statistics',
    options: [
        {
            name: 'scope',
            type: 3, // STRING
            description: 'Choose "self" for your stats or "server" for global server stats',
            required: false,
            // You can enforce choices in Discord when registering commands
            choices: [
                { name: 'self', value: 'self' },
                { name: 'server', value: 'server' }
            ]
        },
        {
            name: 'user',
            type: 6, // USER type; used only when scope is "self"
            description: 'The user to view stats for (optional, defaults to yourself)',
            required: false,
        },
    ],
    async execute(interaction, dialogues) {
        const scope = interaction.options.getString('scope') || 'self';
        const guildId = interaction.guild.id;
        if (scope === 'server') {
            // Global server stats
            const ranking = getServerRanking(guildId);
            let totalMessages = 0, totalXp = 0;
            ranking.forEach(user => {
                totalMessages += user.messages;
                totalXp += user.xp;
            });
            const avgXp = ranking.length > 0 ? (totalXp / ranking.length).toFixed(2) : 0;
            const levelConfig = getLevelConfig();
            let response = [
                `**Server Global Stats:**`,
                `Total users: ${ranking.length}`,
                `Total messages: ${totalMessages}`,
                `Total XP: ${totalXp}`,
                `Average XP per user: ${avgXp}`,
                ``,
                `**Level Settings:** XP per message: ${levelConfig.xpPerMessage}, XP per level: ${levelConfig.xpPerLevel}`,
                ``,
                `**Top Rankings:**`
            ];
            ranking.slice(0, 5).forEach((user, idx) => {
                response.push(`${idx + 1}. <@${user.userId}> – Level ${user.level} (${user.xp} XP)`);
            });
            await interaction.reply(response.join('\n'));
        } else {
            // Personal stats (or of specified user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userStats = getUserStats(guildId, targetUser.id);
            const levelConfig = getLevelConfig();
            const ranking = getServerRanking(guildId);
            const userRank = ranking.findIndex(u => u.userId === targetUser.id) + 1;
            const nextLevelThreshold = userStats.level * levelConfig.xpPerLevel;
            const xpRemaining = nextLevelThreshold - userStats.xp;
  
            const response = [
                `**Stats for ${targetUser.username}:**`,
                `Messages sent: ${userStats.messages}`,
                `Accumulated XP: ${userStats.xp}`,
                `Current level: ${userStats.level}`,
                `XP needed for next level: ${xpRemaining}`,
                `Server ranking: ${userRank} / ${ranking.length}`,
                ``,
                `**Level Settings:** XP per message: ${levelConfig.xpPerMessage}, XP per level: ${levelConfig.xpPerLevel}`
            ].join('\n');
  
            await interaction.reply(response);
        }
    },
};