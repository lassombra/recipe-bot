import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import dotenv from 'dotenv';
import initializeCommands from './commandHandler.js';


dotenv.config();

type ClientWithCommands = Client & {
  commands?: Collection<string, any>;
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
}) as ClientWithCommands;

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

export default client as ClientWithCommands;

await initializeCommands();


client.login(process.env.DISCORD_TOKEN);