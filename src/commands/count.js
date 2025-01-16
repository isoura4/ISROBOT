let currentNumber = 0;
let lastUser = null;

module.exports = {
    name: 'count',
    description: 'Start the counting game',
    async execute(interaction) {
        const args = interaction.options.getString('number');
        if (!args) {
            await interaction.reply('Let\'s start counting! The first number is 0.');
            currentNumber = 0;
            lastUser = null;
        } else {
            const number = parseInt(args, 10);
            if (isNaN(number)) {
                await interaction.reply('Please enter a valid number.');
                return;
            }

            if (interaction.user.id === lastUser) {
                await interaction.reply('You cannot answer twice in a row!');
                return;
            }

            if (number === currentNumber + 1) {
                currentNumber = number;
                lastUser = interaction.user.id;
                await interaction.reply(`Next number is ${currentNumber + 1}`);
            } else {
                await interaction.reply(`Wrong number! We start again from 0.`);
                currentNumber = 0;
                lastUser = null;
            }
        }
    }
};