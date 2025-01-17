import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stateFilePath = path.join(__dirname, 'stream-state.json');

export default {
    name: 'disable-twitch',
    description: 'Disable Twitch ads',
    async execute(interaction, dialogues) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: dialogues.stream.no_permission, ephemeral: true });
        }

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