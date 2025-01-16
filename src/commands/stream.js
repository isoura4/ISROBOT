const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');

let streamCheckInterval = null;
let streamChannelId = null;
let streamerName = null;

module.exports = {
    name: 'stream',
    description: 'Set up stream checking functionality',
    async execute(message, args) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        if (args.length < 2) {
            return message.reply('Usage: !stream <channel_id> <streamer_name>');
        }

        streamChannelId = args[0];
        streamerName = args[1];

        if (streamCheckInterval) {
            clearInterval(streamCheckInterval);
        }

        streamCheckInterval = setInterval(async () => {
            const isLive = await checkStreamStatus(streamerName);
            if (isLive) {
                const channel = message.guild.channels.cache.get(streamChannelId);
                if (channel) {
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${streamerName} is live!`)
                        .setDescription(`Check out the stream: https://twitch.tv/${streamerName}`);
                    channel.send({ embeds: [embed] });
                }
            }
        }, 300000); // Check every 5 minutes

        message.reply(`Stream checking set up for ${streamerName} in channel <#${streamChannelId}>.`);
    }
};

async function checkStreamStatus(streamerName) {
    // Replace with actual API call to check stream status
    // Example for Twitch:
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
        }
    });
    const data = await response.json();
    return data.data && data.data.length > 0;
}