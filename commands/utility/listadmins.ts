import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType, MessageFlags } from 'discord.js';
import type { Command } from '../../command.js';
import { db } from '../../db/index.js';
import { botAdminUsers } from '../../db/schema.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('listadmins')
        .setDescription('Lists all bot admin users')
        .setContexts([InteractionContextType.BotDM])
        .setIntegrationTypes([ApplicationIntegrationType.UserInstall]),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const admins = await db.select().from(botAdminUsers);
            if (admins.length === 0) {
                await interaction.editReply({ content: 'No bot admins have been added.' });
                return;
            }
            const list = admins.map(a => `<@${a.userId}> (added ${a.grantedAt})`).join('\n');
            await interaction.editReply({ content: `**Bot Admins:**\n${list}` });
        } catch (error) {
            console.error('Error listing bot admins:', error);
            await interaction.editReply({ content: 'An error occurred while listing bot admins.' });
        }
    },
    requiresSuperAdmin: true,
};

export default command;
