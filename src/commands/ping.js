export default {
    name: 'ping',
    description: 'Measures the ping between the Discord server and the bot.',
    async execute(interaction, t) {
      await interaction.reply({ content: t('ping.reply') });
      const sentMessage = await interaction.fetchReply();
      const ping = sentMessage.createdTimestamp - interaction.createdTimestamp;
  
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Ping')
        .setDescription(t('ping.pong', { ping }));
  
      await interaction.editReply({ content: null, embeds: [embed] });
    },
  };