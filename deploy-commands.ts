import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs, { readdirSync } from 'node:fs';
import path, { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command } from './command.js';

dotenv.config();

(async () => {
    const commands = [];
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const foldersPath = join(__dirname, 'commands');

    for (const folder of readdirSync(foldersPath)) {
    const commandFiles = readdirSync(join(foldersPath, folder))
        .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

        for (const file of commandFiles) {
            const filePath = join(foldersPath, folder, file);
            const module = await import(pathToFileURL(filePath).href);
            for (const exportName in module) {
                const exportedItem = module[exportName];
                if (exportedItem.prototype && exportedItem.prototype instanceof Command) {
                    const commandInstance = new exportedItem();
                    commands.push(commandInstance.data.toJSON());
                }
            }
        }
    }
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