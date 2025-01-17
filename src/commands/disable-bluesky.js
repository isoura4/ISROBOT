import fs from 'fs';
import path from 'path';

const stateFilePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'stream-state.json');

export default {
    name: 'disable-bluesky',
    description: 'Disable Bluesky ads',
    async execute(interaction, dialogues) {
        try {
            let streamState = {
                bluesky: {
                    streamChannelId: null,
                    streamerName: null,
                    roleId: null
                }
            };

            if (fs.existsSync(stateFilePath)) {
                const data = fs.readFileSync(stateFilePath, 'utf8');
                streamState = JSON.parse(data);
            }

            streamState.bluesky.streamChannelId = null;
            streamState.bluesky.streamerName = null;
            streamState.bluesky.roleId = null;

            fs.writeFileSync(stateFilePath, JSON.stringify(streamState, null, 2));
            await interaction.reply(dialogues.disable_bluesky.success);
        } catch (error) {
            console.error(error);
            await interaction.reply(dialogues.disable_bluesky.error);
        }
    }
};