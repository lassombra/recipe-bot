import { MessageFlags } from 'discord.js';
import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIModalSubmitInteraction,
} from 'discord.js';
import { editResponseText } from './client.js';
import { Command } from './command.js';
import { loadAllCommands } from './loaders/commandLoader.js';
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
        responder.updateMessageText('No handler found for this button interaction.');
        return;
    }
    try {
        await handler.handleButton(interaction, responder);
    } catch (error) {
        console.error(error);
        responder.updateMessageText('There was an error while executing this action!');
    }
}

export async function handleModalInteraction(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
    const prefix = interaction.data.custom_id.split(':')[0];
    const handler = getCommands().subCommandHandlers.get(prefix ?? '');
    if (!prefix || !handler) {
        responder.updateMessageText('No handler found for this modal interaction.');
        return;
    }
    try {
        await handler.handleModal(interaction, responder);
    } catch (error) {
        console.error(error);
        responder.updateMessageText('There was an error while executing this modal action!');
    }
}

export async function handleSelectInteraction(interaction: APIMessageComponentSelectMenuInteraction, responder: APIResponder): Promise<void> {
    const prefix = interaction.data.custom_id.split(':')[0];
    const handler = getCommands().subCommandHandlers.get(prefix ?? '');
    if (!prefix || !handler) {
        responder.updateMessageText('No handler found for this select interaction.');
        return;
    }
    try {
        await handler.handleSelect(interaction, responder);
    } catch (error) {
        console.error(error);
        responder.updateMessageText('There was an error while executing this select action!');
    }
}