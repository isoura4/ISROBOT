const fetch = require('node-fetch');
const fs = require('fs');
const config = require('../config.json');

const getTwitchOAuthToken = async (guildId) => {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    if (!serverConfig.servers[guildId].twitchOAuthToken) {
        try {
            const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${config.twitchClientId}&client_secret=${config.twitchClientSecret}&grant_type=client_credentials`, {
                method: 'POST'
            });
            const data = await response.json();
            serverConfig.servers[guildId].twitchOAuthToken = data.access_token;
            fs.writeFileSync('serverConfig.json', JSON.stringify(serverConfig, null, 2));
            console.log(`Token OAuth obtenu avec succès pour le serveur ${guildId}.`);
        } catch (error) {
            console.error(`Erreur lors de l'obtention du token OAuth pour le serveur ${guildId}:`, error);
        }
    }
    return serverConfig.servers[guildId].twitchOAuthToken;
};

module.exports = getTwitchOAuthToken;
