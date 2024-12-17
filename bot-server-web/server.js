const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Charger les configurations
const configPath = '../config.json'; // Chemin vers le fichier config.json du bot
const serverConfigPath = '../serverConfig.json'; // Chemin vers le fichier serverConfig.json du bot
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const serverConfig = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));

// Route pour obtenir les configurations
app.get('/config', (req, res) => {
    res.json(config);
});

// Route pour mettre à jour les configurations
app.post('/config', (req, res) => {
    const newConfig = req.body;
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    res.json({ message: 'Configuration mise à jour avec succès.' });
});

// Route pour obtenir les configurations du serveur
app.get('/server-config/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    if (serverConfig.servers[guildId]) {
        res.json(serverConfig.servers[guildId]);
    } else {
        res.status(404).json({ message: 'Configuration du serveur non trouvée.' });
    }
});

// Route pour mettre à jour les configurations du serveur
app.post('/server-config/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const newServerConfig = req.body;
    if (serverConfig.servers[guildId]) {
        serverConfig.servers[guildId] = newServerConfig;
        fs.writeFileSync(serverConfigPath, JSON.stringify(serverConfig, null, 2));
        res.json({ message: 'Configuration du serveur mise à jour avec succès.' });
    } else {
        res.status(404).json({ message: 'Configuration du serveur non trouvée.' });
    }
});

// Route pour l'authentification OAuth2 de Discord
app.get('/discord/login', (req, res) => {
    const redirectUri = `https://discord.com/api/oauth2/authorize?client_id=${config.discordClientId}&redirect_uri=${encodeURIComponent('http://localhost:8080/discord/callback')}&response_type=code&scope=identify%20guilds`;
    res.redirect(redirectUri);
});

// Route pour le callback OAuth2 de Discord
app.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: config.discordClientId,
                client_secret: config.discordClientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'http://localhost:8080/discord/callback'
            })
        });
        const data = await response.json();
        const accessToken = data.access_token;

        // Obtenir les informations de l'utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const userData = await userResponse.json();

        // Obtenir les guildes de l'utilisateur
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const guildsData = await guildsResponse.json();

        // Vérifier si l'utilisateur est administrateur sur un serveur spécifique
        const isAdmin = guildsData.some(guild => guild.id === req.query.guildId && (guild.permissions & 0x8) === 0x8);

        if (isAdmin) {
            res.redirect(`/?guildId=${req.query.guildId}&userId=${userData.id}`);
        } else {
            res.status(403).send('Vous n\'êtes pas administrateur sur ce serveur.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de l\'authentification.');
    }
});

// Servir le fichier index.html à la racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
