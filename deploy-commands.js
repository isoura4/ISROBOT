import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = await import(`./src/commands/${file}`);
    commands.push({
        name: command.default.name,
        description: command.default.description,
        options: command.default.options || [],
    });
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

export async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}