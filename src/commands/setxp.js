import { updateLevelConfig, getLevelConfig } from '../levels.js';

export default {
    name: 'setxp',
    description: 'Set leveling parameters (XP per message and/or XP per level). Admin only.',
    options: [
        {
            name: 'xp_per_message',
            type: 4, // INTEGER type; Discord uses 4 for INTEGER
            description: 'XP awarded per message',
            required: false,
        },
        {
            name: 'xp_per_level',
            type: 4,
            description: 'XP needed to level up',
            required: false,
        },
    ],
    async execute(interaction, dialogues) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: dialogues.stream.no_permission, ephemeral: true });
        }
  
        const xpPerMessage = interaction.options.getInteger('xp_per_message');
        const xpPerLevel = interaction.options.getInteger('xp_per_level');
  
        if (xpPerMessage === null && xpPerLevel === null) {
            const currentConfig = getLevelConfig();
            return interaction.reply(`Current level settings:\nXP per message: ${currentConfig.xpPerMessage}\nXP per level: ${currentConfig.xpPerLevel}`);
        }
  
        updateLevelConfig({
            ...(xpPerMessage !== null && { xpPerMessage }),
            ...(xpPerLevel !== null && { xpPerLevel }),
        });
  
        const newConfig = getLevelConfig();
        await interaction.reply(`Level settings updated:\nXP per message: ${newConfig.xpPerMessage}\nXP per level: ${newConfig.xpPerLevel}`);
    },
};