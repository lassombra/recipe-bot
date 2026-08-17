import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType, MessageFlags } from 'discord.js';
import { Command } from '../../command.js';
import { db } from '../../db/index.js';
import { botAdminUsers } from '../../db/schema.js';

export class AddAdmin extends Command {
    data = new SlashCommandBuilder()
        .setName('addadmin')
        .setDescription('Adds a user to the bot admin users table')
        .setContexts([InteractionContextType.BotDM])
        .setIntegrationTypes([ApplicationIntegrationType.UserInstall])
        .addStringOption(option =>
            option
                .setName('user')
                .setDescription('The user id to grant admin access')
                .setRequired(true)
        ) as SlashCommandBuilder;
    protected async isCommandAllowed(interaction: ChatInputCommandInteraction) {
        return this.isSuperUser(interaction);
    }
    protected async internalHandleCommand(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const user = interaction.options.getString('user', true);
            await db.insert(botAdminUsers).values({ userId: user }).onConflictDoNothing();
            await interaction.editReply({ content: `<@${user}> has been added as a bot admin.` });
        } catch (error) {
            console.error('Error adding bot admin:', error);
            await interaction.editReply({ content: 'An error occurred while adding the bot admin.' });
        }
    }
}
