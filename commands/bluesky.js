const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bluesky')
        .setDescription('Récupère et affiche les messages de Bluesky.'),
    async execute(interaction) {
        const serverConfig = JSON.parse(fs.readFileSync('serverConfig.json', 'utf8'));
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        const channelId = serverConfig.servers[interaction.guildId]?.blueskyChannelId;
        const blueskyHandle = serverConfig.servers[interaction.guildId]?.blueskyHandle;
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply('Le salon pour les messages de Bluesky n\'a pas été défini.');
        }

        if (!blueskyHandle) {
            return interaction.reply('Le handle Bluesky n\'a pas été défini.');
        }

        try {
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

            // Étape 3 : Récupération du dernier post
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

                channel.send({ embeds: [embed] });
                await interaction.reply('Le dernier message de Bluesky a été posté avec succès.');
            } else {
                await interaction.reply('Aucun post trouvé pour cet utilisateur.');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('Désolé, je n\'ai pas pu récupérer les messages de Bluesky.');
        }
    }
};
