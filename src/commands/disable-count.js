import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stateFilePath = path.join(__dirname, 'count-state.json');

export default {
    name: 'disable-count',
    description: 'Disable the counting mini-game',
    async execute(interaction, dialogues) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: dialogues.stream.no_permission, ephemeral: true });
        }

        try {
            if (fs.existsSync(stateFilePath)) {
                fs.unlinkSync(stateFilePath);
                await interaction.reply(dialogues.disable_count.success);
            } else {
                await interaction.reply(dialogues.disable_count.not_enabled);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply(dialogues.disable_count.error);
        }
    }
};