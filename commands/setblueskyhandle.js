const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setblueskyhandle')
        .setDescription('Définit le handle Bluesky à suivre.')
        .addStringOption(option =>
            option.setName('handle')
                .setDescription('Le handle Bluesky à suivre.')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const handle = interaction.options.getString('handle');
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        serverConfig.servers[interaction.guildId] = serverConfig.servers[interaction.guildId] || {};
        serverConfig.servers[interaction.guildId].blueskyHandle = handle;
        fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));

        await interaction.reply(`Le handle Bluesky à suivre a été défini sur ${handle}.`);
    }
};
