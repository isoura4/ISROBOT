let currentNumber = 0;
let lastUser = null;

module.exports = {
    name: 'count',
    description: 'Start the counting game',
    execute(message) {
        const args = message.content.split(' ');
        if (args.length === 1) {
            message.channel.send('Let\'s start counting! The first number is 0.');
            currentNumber = 0;
            lastUser = null;
        } else {
            const number = parseInt(args[1], 10);
            if (isNaN(number)) {
                message.channel.send('Please enter a valid number.');
                return;
            }

            if (message.author.id === lastUser) {
                message.channel.send('You cannot answer twice in a row!');
                return;
            }

            if (number === currentNumber + 1) {
                currentNumber = number;
                lastUser = message.author.id;
                message.channel.send(`Next number is ${currentNumber + 1}`);
            } else {
                message.channel.send(`Wrong number! We start again from 0.`);
                currentNumber = 0;
                lastUser = null;
            }
        }
    }
};