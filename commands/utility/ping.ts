import {SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType, MessageFlags} from 'discord.js';
import { Command } from '../../command.js';

export class Ping extends Command {
    data = new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setContexts([InteractionContextType.BotDM])
        .setIntegrationTypes([ApplicationIntegrationType.UserInstall]);
    protected async internalHandleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.reply({ content: 'Pong!', flags: MessageFlags.Ephemeral });
    }
    protected async isCommandAllowed(interaction: ChatInputCommandInteraction): Promise<boolean> {
        return this.isSuperUser(interaction);
    }
}