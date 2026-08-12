import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, MessageFlags, type InteractionUpdateOptions, type InteractionReplyOptions, MessagePayload } from 'discord.js';

export abstract class Command {
    abstract data: SlashCommandBuilder;
    buttonPrefix?: string;
    buttons: Map<string, Button> = new Map();
    async handleButton(interaction: ButtonInteraction): Promise<void> {
        const buttonId = this.getSubCommandId(interaction);
        if (!(await this.isButtonAllowed(interaction, buttonId))) {
            await interaction.update({ content: this.disallowedButtonMessage(interaction), components: [] });
            return;
        }
        await this.internalHandleButton(interaction);
    }
    async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!(await this.isCommandAllowed(interaction))) {
            await interaction.reply({ content: this.disallowedMessage(interaction), flags: MessageFlags.Ephemeral });
            return;
        }
        await this.internalHandleCommand(interaction);
    }
    private getSubCommandId(interaction: ButtonInteraction | ModalSubmitInteraction): string {
        return interaction.customId.split(this.buttonPrefix ?? '')[1]?.split(':')[1] ?? '';
    }
    protected async isCommandAllowed(interaction: ChatInputCommandInteraction): Promise<boolean> {
        return true;
    }
    protected async isButtonAllowed(interaction: ButtonInteraction, buttonId: string): Promise<boolean> {
        return true;
    }
    protected async isModalAllowed(interaction: ModalSubmitInteraction, modalId: string): Promise<boolean> {
        return true;
    }
    protected isSuperUser(interaction: ChatInputCommandInteraction): boolean {
        return interaction.user.id === process.env.SUPER_ADMIN_USER;
    }
    protected async internalHandleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.reply({ content: 'This command has not been implemented yet.', flags: MessageFlags.Ephemeral });
    }
    protected async internalHandleButton(interaction: ButtonInteraction): Promise<void> {
        const buttonId = this.getSubCommandId(interaction);
        const button = this.buttons.get(buttonId);
        if (button) {
            const customData = interaction.customId.split(buttonId)[1]?.split(':')[1];
            return button.handle(interaction, customData);
        }
        await interaction.update({ content: 'This button has not been implemented yet.', components: [] });
    }
    protected disallowedMessage(interaction: ChatInputCommandInteraction) {
        return 'You do not have permission to use this command.';
    }
    protected disallowedButtonMessage(interaction: ButtonInteraction) {
        return 'You do not have permission to use this button.';
    }
}

export interface Button {
    buttonPrefix: string;
    handle(interaction: ButtonInteraction, customData?: string): Promise<void>;
}