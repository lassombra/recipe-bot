import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import client from './index.js';
import { Collection, Events } from 'discord.js';

export default async function initializeCommands():Promise<void> {

    client.commands = new Collection();

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const foldersPath = join(__dirname, 'commands');

    for (const folder of readdirSync(foldersPath)) {
    const commandFiles = readdirSync(join(foldersPath, folder))
        .filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(foldersPath, folder, file);
        const { default: command } = await import(pathToFileURL(filePath).href);
        if (command?.data && command?.execute) {
            client.commands.set(command.data.name, command.execute);
        }
    }
    }

    client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) return;

    try {
        await command(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
    });
}