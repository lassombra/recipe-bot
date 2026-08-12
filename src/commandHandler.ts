import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import client from './index.js';
import { Collection, Events, MessageFlags } from 'discord.js';
import { Command } from './command.js';
import { loadAllCommands } from './loaders/commandLoader.js';

export default async function initializeCommands():Promise<void> {

    client.commands = new Collection();
    const subCommandHandlers = new Collection<string, Command>();
    const commandInstances = loadAllCommands();
    for (const commandInstance of commandInstances) {
        client.commands.set(commandInstance.data.name, commandInstance);
        if (commandInstance.buttonPrefix) {
            subCommandHandlers.set(commandInstance.buttonPrefix, commandInstance);
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