const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config.json');
const fs = require('fs');

const rest = new REST({ version: '10' }).setToken(token);

const cleanGuildCommands = async (guildId) => {
    try {
        console.log(`Récupération des commandes slash pour le serveur ${guildId}...`);
        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

        if (commands.length === 0) {
            console.log(`Aucune commande trouvée pour le serveur ${guildId}.`);
            return;
        }

        for (const command of commands) {
            console.log(`Suppression de la commande ${command.name} pour le serveur ${guildId}...`);
            await rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id));
            console.log(`Commande ${command.name} supprimée avec succès pour le serveur ${guildId}.`);
        }

        console.log(`Toutes les commandes ont été supprimées avec succès pour le serveur ${guildId}.`);
    } catch (error) {
        console.error(`Erreur lors de la suppression des commandes slash pour le serveur ${guildId}:`, error);
    }
};

(async () => {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    const guildIds = Object.keys(serverConfig.servers);

    for (const guildId of guildIds) {
        await cleanGuildCommands(guildId);
    }
})();
