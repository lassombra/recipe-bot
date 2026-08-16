import { InteractionResponseType, MessageFlags, type APIChatInputApplicationCommandInteraction, type APIMessageComponentButtonInteraction } from 'discord.js';
import { Command } from './command.js';
import { loadAllCommands } from './loaders/commandLoader.js';
import type { FastifyReply } from 'fastify';
import type { APIResponder } from './server.js';

interface CommandHandlers {
    commandHandlers: Map<string, Command>;
    subCommandHandlers: Map<string, Command>;
}

let commands: CommandHandlers | null = null;

function initializeCommands(): void {
    const subCommandHandlers = new Map<string, Command>();
    const commandInstances = loadAllCommands();
    const commandHandlers = new Map<string, Command>();
    for (const commandInstance of commandInstances) {
        commandHandlers.set(commandInstance.data.name, commandInstance);
        if (commandInstance.buttonPrefix) {
            subCommandHandlers.set(commandInstance.buttonPrefix, commandInstance);
        }
    }
    commands = {commandHandlers, subCommandHandlers};
}

function getCommands(): CommandHandlers {
    if (!commands) {
        initializeCommands();
    }
    return commands!;
}

export async function handleSlashCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder) : Promise<void> {
    if (!getCommands().commandHandlers.has(interaction.data.name)) {
        responder.newMessage({ content: 'Command not found!', flags: MessageFlags.Ephemeral });
        return;
    }

    const command = getCommands().commandHandlers.get(interaction.data.name)!;
    await command.handleCommand(interaction, responder); 
}

export async function handleButtonInteraction(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
    const prefix = interaction.data.custom_id.split(':')[0];
    const handler = getCommands().subCommandHandlers.get(prefix ?? '');
    if (!prefix || !handler) {
        responder.newMessage({ content: 'No handler found for this button interaction.', flags: MessageFlags.Ephemeral });
        return;
    }
    try {
        await handler.handleButton(interaction, responder);
    } catch (error) {
        console.error(error);
        responder.updateMessage({ content: 'There was an error while executing this action!', flags: MessageFlags.Ephemeral });
    }
}

    // client.on(Events.InteractionCreate, async (interaction) => {
    //     if (interaction.isButton()) {
    //         const prefix = interaction.customId.split(':')[0];
    //         const handler = subCommandHandlers.get(prefix ?? '');
    //         if (!prefix || !handler) {
    //             await interaction.update({ content: 'No handler found for this button interaction.'});
    //             return;
    //         }
    //         try {
    //             await handler.handleButton(interaction);
    //         } catch (error) {
    //             console.error(error);
    //             await interaction.update({ content: 'There was an error while executing this action!' });
    //         }
    //         return;
    //     }

    //     if (!interaction.isChatInputCommand()) return;

    //     const command = client.commands?.get(interaction.commandName);
    //     if (!command) {
    //         await interaction.reply({ content: 'Command not found.', flags: MessageFlags.Ephemeral });
    //         return;
    //     }

    //     if (command.requiresSuperAdmin && interaction.user.id !== process.env.SUPER_ADMIN_USER) {
    //         await interaction.reply({ content: 'You do not have permission to execute this command!', flags: MessageFlags.Ephemeral });
    //         return;
    //     }

    //     try {
    //         await command.handleCommand(interaction);
    //     } catch (error) {
    //         console.error(error);
    //         await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    //     }
    // });