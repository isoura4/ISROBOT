import fs from 'fs';
import path from 'path';

const stateFilePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'stream-state.json');

export default {
    name: 'disable-twitch',
    description: 'Disable Twitch ads',
    async execute(interaction, dialogues) {
        try {
            let streamState = {
                twitch: {
                    streamChannelId: null,
                    streamerName: null,
                    roleId: null
                }
            };

            if (fs.existsSync(stateFilePath)) {
                const data = fs.readFileSync(stateFilePath, 'utf8');
                streamState = JSON.parse(data);
            }

            streamState.twitch.streamChannelId = null;
            streamState.twitch.streamerName = null;
            streamState.twitch.roleId = null;

            fs.writeFileSync(stateFilePath, JSON.stringify(streamState, null, 2));
            await interaction.reply(dialogues.disable_twitch.success);
        } catch (error) {
            console.error(error);
            await interaction.reply(dialogues.disable_twitch.error);
        }
    }
};