import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, MessageFlags, type InteractionUpdateOptions, type InteractionReplyOptions, MessagePayload, InteractionResponseType, type APIChatInputApplicationCommandInteraction, type APIChatInputApplicationCommandDMInteraction, type APIChatInputApplicationCommandGuildInteraction, type APIMessageComponentButtonInteraction } from 'discord.js';
import type { FastifyReply } from 'fastify';
import type { APIResponder } from './server.js';

export abstract class Command {
    abstract data: SlashCommandBuilder;
    buttonPrefix?: string;
    buttons: Map<string, Button> = new Map();
    async handleButton(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const buttonId = this.getSubCommandId(interaction);
        if (!(await this.isButtonAllowed(interaction, buttonId))) {
            responder.updateMessage({ content: this.disallowedButtonMessage(interaction), flags: MessageFlags.Ephemeral });
            return;
        }
        await this.internalHandleButton(interaction, responder);
    }
    async handleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder): Promise<void> {
        if (!(await this.isCommandAllowed(interaction))) {
            responder.newMessage({ content: this.disallowedMessage(interaction), flags: MessageFlags.Ephemeral }); 
            return;
        }
        return this.internalHandleCommand(interaction, responder);
    }
    private getSubCommandId(interaction: APIMessageComponentButtonInteraction): string {
        return interaction.data.custom_id.split(this.buttonPrefix ?? '')[1]?.split(':')[1] ?? '';
    }
    protected async isCommandAllowed(interaction: APIChatInputApplicationCommandInteraction): Promise<boolean> {
        return true;
    }
    protected async isButtonAllowed(interaction: APIMessageComponentButtonInteraction, buttonId: string): Promise<boolean> {
        return true;
    }
    protected async isModalAllowed(interaction: ModalSubmitInteraction, modalId: string): Promise<boolean> {
        return true;
    }
    protected isSuperUser(interaction: APIChatInputApplicationCommandInteraction): boolean {
        if (interaction.guild_id === undefined) {
            const dmInteraction = interaction as APIChatInputApplicationCommandDMInteraction;
            return dmInteraction.user.id === process.env.SUPER_ADMIN_USER;
        } else {
            const guildInteraction = interaction as APIChatInputApplicationCommandGuildInteraction;
            return guildInteraction.member?.user.id === process.env.SUPER_ADMIN_USER;
        }
    }
    protected async internalHandleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder): Promise<void> {
        responder.newMessage({ content: 'This command has not been implemented yet.', flags: MessageFlags.Ephemeral });
    }
    protected async internalHandleButton(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const buttonId = this.getSubCommandId(interaction);
        const button = this.buttons.get(buttonId);
        if (button) {
            const customData = interaction.data.custom_id.split(buttonId)[1]?.split(':')[1];
            return button.handle(interaction, responder, customData);
        }
        responder.updateMessage({ content: 'This button has not been implemented yet.', flags: MessageFlags.Ephemeral });
    }
    protected disallowedMessage(interaction: APIChatInputApplicationCommandInteraction) {
        return 'You do not have permission to use this command.';
    }
    protected disallowedButtonMessage(interaction: APIMessageComponentButtonInteraction) {
        return 'You do not have permission to use this button.';
    }
}

export interface Button {
    buttonPrefix: string;
    handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void>;
}