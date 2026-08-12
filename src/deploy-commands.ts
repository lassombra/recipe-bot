import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { loadAllCommands } from './loaders/commandLoader.js';

dotenv.config();

(async () => {
    const commands = loadAllCommands().map(command => command.data.toJSON());
    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);
    // and deploy your commands!

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(Routes.applicationCommands(process.env.APP_ID as string), 
            { body: commands }) as any[];
		console.log(`Successfully reloaded ${data.length} application (/) commands.`, data);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();