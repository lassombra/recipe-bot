import {SlashCommandBuilder, ChatInputCommandInteraction} from 'discord.js';
import type { Command } from '../../command.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Pong!');
    },
};
export default command;