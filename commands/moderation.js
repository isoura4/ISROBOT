const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Gérer les rôles, les salons, et les permissions.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulser un membre du serveur.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Le membre à expulser.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison de l\'expulsion.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Bannir un membre du serveur.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Le membre à bannir.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison du bannissement.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Rendre un membre muet.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Le membre à rendre muet.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison de rendre muet.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Rendre la parole à un membre.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Le membre à qui rendre la parole.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('createchannel')
                .setDescription('Créer un nouveau salon.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Le nom du salon.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Le type de salon (text, voice).')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Text', value: 'text' },
                            { name: 'Voice', value: 'voice' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('deletechannel')
                .setDescription('Supprimer un salon.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Le salon à supprimer.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('createrole')
                .setDescription('Créer un nouveau rôle.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Le nom du rôle.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('La couleur du rôle (HEX).')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleterole')
                .setDescription('Supprimer un rôle.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Le rôle à supprimer.')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        // Vérifier si l'utilisateur a les droits d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Vous n\'avez pas les droits nécessaires pour utiliser cette commande.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'kick':
                await kickUser(interaction);
                break;
            case 'ban':
                await banUser(interaction);
                break;
            case 'mute':
                await muteUser(interaction);
                break;
            case 'unmute':
                await unmuteUser(interaction);
                break;
            case 'createchannel':
                await createChannel(interaction);
                break;
            case 'deletechannel':
                await deleteChannel(interaction);
                break;
            case 'createrole':
                await createRole(interaction);
                break;
            case 'deleterole':
                await deleteRole(interaction);
                break;
            default:
                await interaction.reply({ content: 'Sous-commande inconnue.', ephemeral: true });
        }
    },
};

async function kickUser(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie.';

    try {
        await interaction.guild.members.kick(user, { reason: reason });
        await interaction.reply({ content: `Le membre ${user.tag} a été expulsé avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de l\'expulsion du membre.', ephemeral: true });
    }
}

async function banUser(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie.';

    try {
        await interaction.guild.members.ban(user, { reason: reason });
        await interaction.reply({ content: `Le membre ${user.tag} a été banni avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors du bannissement du membre.', ephemeral: true });
    }
}

async function muteUser(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie.';

    try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(60 * 60 * 1000, reason); // Mute for 1 hour
        await interaction.reply({ content: `Le membre ${user.tag} a été rendu muet avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de rendre muet le membre.', ephemeral: true });
    }
}

async function unmuteUser(interaction) {
    const user = interaction.options.getUser('user');

    try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(null); // Unmute
        await interaction.reply({ content: `Le membre ${user.tag} a été rendu la parole avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de rendre la parole au membre.', ephemeral: true });
    }
}

async function createChannel(interaction) {
    const name = interaction.options.getString('name');
    const type = interaction.options.getString('type');

    try {
        await interaction.guild.channels.create({
            name: name,
            type: type === 'text' ? 0 : 2, // 0 for text, 2 for voice
        });
        await interaction.reply({ content: `Le salon ${name} a été créé avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de la création du salon.', ephemeral: true });
    }
}

async function deleteChannel(interaction) {
    const channel = interaction.options.getChannel('channel');

    try {
        await channel.delete();
        await interaction.reply({ content: `Le salon ${channel.name} a été supprimé avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de la suppression du salon.', ephemeral: true });
    }
}

async function createRole(interaction) {
    const name = interaction.options.getString('name');
    const color = interaction.options.getString('color') || '#000000';

    try {
        await interaction.guild.roles.create({
            name: name,
            color: color,
        });
        await interaction.reply({ content: `Le rôle ${name} a été créé avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de la création du rôle.', ephemeral: true });
    }
}

async function deleteRole(interaction) {
    const role = interaction.options.getRole('role');

    try {
        await role.delete();
        await interaction.reply({ content: `Le rôle ${role.name} a été supprimé avec succès.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Erreur lors de la suppression du rôle.', ephemeral: true });
    }
}
