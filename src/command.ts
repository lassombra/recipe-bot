import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { 
    APIChatInputApplicationCommandInteraction, 
    APIChatInputApplicationCommandDMInteraction, 
    APIChatInputApplicationCommandGuildInteraction, 
    APIMessageComponentButtonInteraction, 
    APIMessageComponentSelectMenuInteraction,
    APIModalSubmitInteraction } from 'discord.js';
import type { APIResponder } from './server.js';

export abstract class Command {
    abstract data: SlashCommandBuilder;
    buttonPrefix?: string;
    buttons: Map<string, Button> = new Map();
    modals: Map<string, Modal> = new Map();
    selects: Map<string, Select> = new Map();

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
    async handleModal(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
        const modalId = this.getSubCommandId(interaction);
        if (!(await this.isModalAllowed(interaction, modalId))) {
            responder.updateMessage({ content: this.disallowedModalMessage(interaction), flags: MessageFlags.Ephemeral });
            return;
        }
        await this.internalHandleModal(interaction, responder);
    }
    async handleSelect(interaction: APIMessageComponentSelectMenuInteraction, responder: APIResponder): Promise<void> {
        const selectId = this.getSubCommandId(interaction);
        if (!(await this.isSelectAllowed(interaction, selectId))) {
            responder.updateMessage({ content: this.disallowedSelectMessage(interaction), flags: MessageFlags.Ephemeral });
            return;
        }
        await this.internalHandleSelect(interaction, responder);
    }

    private getSubCommandId(interaction: APIMessageComponentButtonInteraction | APIMessageComponentSelectMenuInteraction | APIModalSubmitInteraction): string {
        return interaction.data.custom_id.split(this.buttonPrefix ?? '')[1]?.split(':')[1] ?? '';
    }

    protected async isCommandAllowed(interaction: APIChatInputApplicationCommandInteraction): Promise<boolean> {
        return true;
    }
    protected async isButtonAllowed(interaction: APIMessageComponentButtonInteraction, buttonId: string): Promise<boolean> {
        return true;
    }
    protected async isModalAllowed(interaction: APIModalSubmitInteraction, modalId: string): Promise<boolean> {
        return true;
    }
    protected async isSelectAllowed(interaction: APIMessageComponentSelectMenuInteraction, selectId: string): Promise<boolean> {
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
            const customData = interaction.data.custom_id.split(`${this.buttonPrefix}:${buttonId}:`)[1];
            return button.handle(interaction, responder, customData);
        }
        responder.updateMessageText('This button has not been implemented yet.');
    }
    protected async internalHandleModal(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
        const modalId = this.getSubCommandId(interaction);
        const modal = this.modals.get(modalId);
        if (modal) {
            const customData = interaction.data.custom_id.split(modalId)[1]?.split(':')[1];
            return modal.handle(interaction, responder, customData);
        }
        console.log('Modal not implemented:', modalId);
        responder.updateMessageText('This modal has not been implemented yet.');
    }
    protected async internalHandleSelect(interaction: APIMessageComponentSelectMenuInteraction, responder: APIResponder): Promise<void> {
        const selectId = this.getSubCommandId(interaction);
        const select = this.selects.get(selectId);
        if (select) {
            const customData = interaction.data.custom_id.split(selectId)[1]?.split(':')[1];
            return select.handle(interaction, responder, customData);
        }
        responder.updateMessageText('This select has not been implemented yet.');
    }

    protected disallowedMessage(interaction: APIChatInputApplicationCommandInteraction) {
        return 'You do not have permission to use this command.';
    }
    protected disallowedButtonMessage(interaction: APIMessageComponentButtonInteraction) {
        return 'You do not have permission to use this button.';
    }
    protected disallowedModalMessage(interaction: APIModalSubmitInteraction) {
        return 'You do not have permission to submit this form.';
    }
    protected disallowedSelectMessage(interaction: APIMessageComponentSelectMenuInteraction) {
        return 'You do not have permission to use this entry.';
    }

    protected registerButtons(buttons: Button[]) {
        for (const button of buttons) {
            this.registerButton(button);
        }
    }
    protected registerButton(button: Button) {
        this.buttons.set(button.prefix, button);
    }
    protected registerModals(modals: Modal[]) {
        for (const modal of modals) {
            this.registerModal(modal);
        }
    }
    protected registerModal(modal: Modal) {
        this.modals.set(modal.prefix, modal);
    }
    protected registerSelects(selects: Select[]) {
        for (const select of selects) {
            this.registerSelect(select);
        }
    }
    protected registerSelect(select: Select) {
        this.selects.set(select.prefix, select);
    }
}

export interface SubCommand<T> {
    prefix: string;
    handle(interaction: T, responder: APIResponder, customData?: string): Promise<void>;
}

export interface Button extends SubCommand<APIMessageComponentButtonInteraction> {
}

export interface Modal extends SubCommand<APIModalSubmitInteraction> {
}

export interface Select extends SubCommand<APIMessageComponentSelectMenuInteraction> {
}