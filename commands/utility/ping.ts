import {SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType} from 'discord.js';
import type { Command } from '../../command.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setContexts([InteractionContextType.BotDM])
        .setIntegrationTypes([ApplicationIntegrationType.UserInstall]),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Pong!');
    },
    requiresSuperAdmin: true
};
export default command;