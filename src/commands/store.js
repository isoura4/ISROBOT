import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';
import dbPromise from '../database.js';

export default {
    name: 'store',
    description: 'Display the store where items can be purchased',
    async execute(interaction, dialogues) {
        // Only allow admins to run this command.
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: dialogues.store.no_permission, ephemeral: true });
        }

        const db = await dbPromise;
        // Get all items from the store_items table.
        const items = await db.all('SELECT * FROM store_items');
        
        // Remove any item that's not meant to be used (e.g. corner_saver).
        const filteredItems = items.filter(item => item.item_key !== 'corner_saver');

        const storeWelcome = dialogues.store.welcome || "Welcome to the store!";
        const storeTitle = dialogues.store.title || "Store";

        let description = storeWelcome + "\n\n";
        const buttons = [];
        for (const item of filteredItems) {
            description += `**${item.name}**\n${item.description}\nCost: ${item.price} coins\nMaximum per user: ${item.max_per_user}\n\n`;
            const btn = new ButtonBuilder()
                .setCustomId(`store_buy_${item.item_key}`)
                .setLabel(`Buy ${item.name}`)
                .setStyle('Primary');
            buttons.push(btn);
        }
        
        const row = new ActionRowBuilder().addComponents(buttons);
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(storeTitle)
            .setDescription(description);
            
        await interaction.reply({ embeds: [embed], components: [row] });
    },
};