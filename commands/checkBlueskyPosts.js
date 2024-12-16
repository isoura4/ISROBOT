const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');

async function checkBlueskyPosts(client, guildId) {
    const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const channelId = serverConfig.servers[guildId]?.blueskyChannelId;
    const mentionRoleId = serverConfig.servers[guildId]?.mentionRoleId;
    const blueskyHandle = serverConfig.servers[guildId]?.blueskyHandle;
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.error(`Le salon pour les messages de Bluesky n'a pas été défini pour le serveur ${guildId}.`);
        return;
    }

    if (!blueskyHandle) {
        console.error(`Le handle Bluesky n'a pas été défini pour le serveur ${guildId}.`);
        return;
    }

    try {
        // Lire l'ID du dernier post récupéré
        let lastPostIdData = fs.readFileSync('lastPostId.json', 'utf8');
        let lastPostId = JSON.parse(lastPostIdData).lastPostId;

        // Étape 1 : Résolution du handle pour obtenir le DID
        const didUrl = `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${blueskyHandle}`;
        const didResponse = await fetch(didUrl, { method: 'GET' });
        const didData = await didResponse.json();
        const did = didData.did;

        // Étape 2 : Récupération de la clé API (accessJwt)
        const apiKeyUrl = 'https://bsky.social/xrpc/com.atproto.server.createSession';
        const tokenPayload = {
            identifier: did,
            password: config.blueskyAppPassword
        };
        const tokenResponse = await fetch(apiKeyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tokenPayload)
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.accessJwt;

        // Étape 3 : Récupération des posts
        const feedUrl = `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${blueskyHandle}`;
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };
        const feedResponse = await fetch(feedUrl, {
            method: 'GET',
            headers: headers
        });
        const feedData = await feedResponse.json();

        // Afficher les posts sous forme d'embeds
        if (feedData.feed && feedData.feed.length > 0) {
            const lastPost = feedData.feed[0]; // Le dernier post est le premier dans la liste

            // Vérifier si l'ID du nouveau post est différent de l'ID stocké
            if (lastPost.uri !== lastPostId) {
                const embed = new EmbedBuilder()
                    .setTitle(lastPost.post.author.displayName || lastPost.post.author.handle)
                    .setDescription(lastPost.post.record.text)
                    .setColor('#0099ff')
                    .setTimestamp(new Date(lastPost.post.record.createdAt));

                // Ajouter les images si elles existent
                if (lastPost.post.embed && lastPost.post.embed.images && lastPost.post.embed.images.length > 0) {
                    const imageUrl = lastPost.post.embed.images[0].fullsize;
                    embed.setImage(imageUrl);
                }

                // Mentionner le rôle spécifique et ajouter le texte avant l'embed
                const role = channel.guild.roles.cache.get(mentionRoleId);
                if (role) {
                    channel.send({ content: `<@&${mentionRoleId}> Nouveau post de Bluesky !`, embeds: [embed] });
                } else {
                    channel.send({ content: 'Nouveau post de Bluesky !', embeds: [embed] });
                }

                // Mettre à jour l'ID du dernier post récupéré
                lastPostIdData = JSON.stringify({ lastPostId: lastPost.uri });
                fs.writeFileSync('lastPostId.json', lastPostIdData, 'utf8');

                console.log('Nouveau post de Bluesky affiché avec succès.');
            } else {
                console.log('Aucun nouveau post trouvé.');
            }
        } else {
            console.log('Aucun post trouvé pour cet utilisateur.');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des messages de Bluesky:', error);
    }
}

module.exports = checkBlueskyPosts;
