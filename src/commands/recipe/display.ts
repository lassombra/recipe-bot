import { SlashCommandBuilder, MessageFlags, InteractionContextType, ApplicationIntegrationType } from 'discord.js';
import type { APIChatInputApplicationCommandInteraction } from 'discord.js';
import { Command } from '../../command.js';
import type { APIResponder } from '../../server.js';

export class DisplayRecipe extends Command {
    data = new SlashCommandBuilder()
        .setName('display-recipe')
        .setDescription('Display a recipe')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]);

    protected async internalHandleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder): Promise<void> {
        responder.newMessage({ content: '/display-recipe', flags: MessageFlags.Ephemeral });
    }
}