import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import client from './index.js';
import { Collection, Events, MessageFlags } from 'discord.js';
import { Command } from './command.js';

export default async function initializeCommands():Promise<void> {

    client.commands = new Collection();
    const subCommandHandlers = new Collection<string, Command>();

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const foldersPath = join(__dirname, 'commands');

    for (const folder of readdirSync(foldersPath)) {
    const commandFiles = readdirSync(join(foldersPath, folder))
        .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

        for (const file of commandFiles) {
            const filePath = join(foldersPath, folder, file);
            const module = await import(pathToFileURL(filePath).href);
            for (const exportName in module) {
                const exportedItem = module[exportName];
                if (exportedItem.prototype && exportedItem.prototype instanceof Command) {
                    const commandInstance = new exportedItem() as Command;
                    client.commands.set(commandInstance.data.name, commandInstance);
                    if (commandInstance.buttonPrefix) {
                        subCommandHandlers.set(commandInstance.buttonPrefix, commandInstance);
                    }
                }
            }
        }
    }

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton()) {
            const prefix = interaction.customId.split(':')[0];
            const handler = subCommandHandlers.get(prefix ?? '');
            if (!prefix || !handler) {
                await interaction.update({ content: 'No handler found for this button interaction.'});
                return;
            }
            try {
                await handler.handleButton(interaction);
            } catch (error) {
                console.error(error);
                await interaction.update({ content: 'There was an error while executing this action!' });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands?.get(interaction.commandName);
        if (!command) {
            await interaction.reply({ content: 'Command not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (command.requiresSuperAdmin && interaction.user.id !== process.env.SUPER_ADMIN_USER) {
            await interaction.reply({ content: 'You do not have permission to execute this command!', flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await command.handleCommand(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    });
}