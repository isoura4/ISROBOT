const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Récupération des commandes slash globales...');
        const commands = await rest.get(Routes.applicationCommands(clientId));

        if (commands.length === 0) {
            console.log('Aucune commande globale trouvée.');
            return;
        }

        for (const command of commands) {
            console.log(`Suppression de la commande globale ${command.name}...`);
            await rest.delete(Routes.applicationCommand(clientId, command.id));
            console.log(`Commande globale ${command.name} supprimée avec succès.`);
        }

        console.log('Toutes les commandes globales ont été supprimées avec succès.');
    } catch (error) {
        console.error('Erreur lors de la suppression des commandes slash globales:', error);
    }
})();
