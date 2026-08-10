import { SlashCommandBuilder, type APIInteractionGuildMember } from 'discord.js';

import type { Command } from '../../command.js';

const command: Command = {
	data: new SlashCommandBuilder().setName('user').setDescription('Provides information about the user.'),
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		console.log(interaction);
		await interaction.reply(
			`This command was run by ${interaction.user.username}, who joined on ${(interaction.member as APIInteractionGuildMember)?.joined_at}.`,
		);
	},
};
export default command;