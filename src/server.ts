import { type APIInteraction, InteractionType, type APIPingInteraction, InteractionResponseType, MessageFlags, type APIApplicationCommandInteraction, type APIChatInputApplicationCommandInteraction, type APIInteractionResponseCallbackData } from 'discord.js';
import Fastify from 'fastify';
// import initializeCommands from './commandHandler.js';
import { verifyKey } from 'discord-interactions';
import { handleSlashCommand } from './commandHandler.js';

export type Respond = (data: APIInteractionResponseCallbackData) => void;
export type Defer = (data: APIInteractionResponseCallbackData) => void;

const fastify = Fastify({logger: true});
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
        done(null, {
            rawBody: body,
            parsed: JSON.parse(body.toString())
        });
    } catch (error: any) {
        error.statusCode = 400;
        done(error, undefined);
    }
});
fastify.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url !== '/interactions') return;
    
    const signature = request.headers['x-signature-ed25519'] as string;
    const timestamp = request.headers['x-signature-timestamp'] as string;
    
    const rawBody = (request.body as {rawBody: string, parsed: any}).rawBody;
    const isValidRequest = await verifyKey(rawBody, signature, timestamp, process.env.PUBLIC_KEY!);
    if (!isValidRequest) {
        reply.status(401).send('Invalid request signature');
        return;
    }
});

fastify.post('/interactions', async (request, reply) => {
    const interaction = (request.body as {rawBody: string, parsed: APIInteraction}).parsed;
    
    if (interaction.type === InteractionType.Ping) {
        const pingInteraction = interaction as APIPingInteraction;
        reply.send({ type: InteractionResponseType.Pong }); // Pong response
        return;
    }
    
    if (interaction.type === InteractionType.ApplicationCommand) {
        const applicationCommandInteraction = interaction as APIChatInputApplicationCommandInteraction;
        function handleResponse(data: APIInteractionResponseCallbackData) {
            reply.send({ type: InteractionResponseType.ChannelMessageWithSource, data });
        }
        function defer(data: APIInteractionResponseCallbackData) {
            reply.send({ type: InteractionResponseType.DeferredChannelMessageWithSource, data });
        }
        await handleSlashCommand(applicationCommandInteraction, handleResponse, defer);
        return;
    }
    
    console.log(interaction);
    
    reply.send({ type: InteractionResponseType.ChannelMessageWithSource, data: { content: 'Command received!', flags: MessageFlags.Ephemeral } });
});

export default async function main() {
    console.log('launching fastify');
    try {
        await fastify.listen({port: 3000, host: '0.0.0.0'});
    } catch (error) {
        console.error('Error starting server:', error);
    }
}