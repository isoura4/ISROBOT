import fs from 'fs';
import path from 'path';

const stateFilePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'count-state.json');

export default {
    name: 'disable-count',
    description: 'Disable the counting mini-game',
    async execute(interaction, dialogues) {
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