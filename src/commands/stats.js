import { getUserStats, getServerRanking, cumulativeXpForLevel } from '../levels.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'stats',
  description: 'View individual or server statistics',
  options: [
    {
      name: 'scope',
      type: 3,
      description: 'Choose "self" for your stats or "server" for global server stats',
      required: true,
      choices: [
        { name: 'self', value: 'self' },
        { name: 'server', value: 'server' }
      ]
    }
  ],
  async execute(interaction, t) {
    try {
      const scope = interaction.options.getString('scope') || 'self';
      const guildId = interaction.guild.id;
      if (scope === 'server') {
        const ranking = await getServerRanking(guildId);
        let totalMessages = 0, totalXp = 0;
        ranking.forEach(user => {
          totalMessages += user.messages;
          totalXp += user.xp;
        });
        const avgXp = ranking.length > 0 ? (totalXp / ranking.length).toFixed(2) : 0;
        let description =
          `${t('stats.total_users')}: ${ranking.length}\n` +
          `${t('stats.total_messages')}: ${totalMessages}\n` +
          `${t('stats.total_xp')}: ${totalXp}\n` +
          `${t('stats.average_xp')}: ${avgXp}\n\n` +
          `**${t('stats.top_rankings')}:**\n`;
        ranking.slice(0, 5).forEach((user, idx) => {
          const member = interaction.guild.members.cache.get(user.userId);
          const name = member ? member.displayName : user.userId;
          description += `${idx + 1}. ${name} – Level ${user.level} (${user.xp} XP)\n`;
        });
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(t('stats.server_title'))
          .setDescription(description);
        await interaction.reply({ embeds: [embed] });
      } else {
        const targetUser = interaction.user;
        const userStats = await getUserStats(guildId, targetUser.id);
        const ranking = await getServerRanking(guildId);
        const userRank = ranking.findIndex(u => u.userId === targetUser.id) + 1;
        const nextThreshold = cumulativeXpForLevel(userStats.level + 1);
        const xpRemaining = parseFloat((nextThreshold - userStats.xp).toFixed(2));

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(t('stats.user_stats_title', { username: targetUser.username }))
          .setDescription(
            `${t('stats.messages_sent')}: ${userStats.messages}\n` +
            `${t('stats.accumulated_xp')}: ${userStats.xp}\n` +
            `${t('stats.current_level')}: ${userStats.level}\n` +
            `${t('stats.xp_needed')}: ${xpRemaining > 0 ? xpRemaining : 0}\n` +
            `${t('stats.server_ranking')}: ${userRank} / ${ranking.length}\n` +
            `${t('stats.corners_won')}: ${userStats.coins}\n`
          );

        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Error in /stats:', err);
      await interaction.reply({ content: t('general.error') || 'There was an error fetching stats.', ephemeral: true });
    }
  },
};