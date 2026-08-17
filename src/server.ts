import type { 
    APIInteraction, 
    APIPingInteraction, 
    APIChatInputApplicationCommandInteraction, 
    APIInteractionResponseCallbackData, 
    APIModalInteractionResponseCallbackData,
    APIMessageComponentButtonInteraction, 
    APIMessageComponentSelectMenuInteraction,
    APIModalSubmitInteraction } from 'discord.js';
import {
    InteractionType,
    InteractionResponseType,
    ComponentType,
    MessageFlags,
    TextDisplayBuilder,
} from 'discord.js';
import Fastify, { type FastifyReply } from 'fastify';
// import initializeCommands from './commandHandler.js';
import { verifyKey } from 'discord-interactions';
import { handleButtonInteraction, handleModalInteraction, handleSelectInteraction, handleSlashCommand } from './commandHandler.js';

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
        await handleSlashCommand(applicationCommandInteraction, new APIResponder(reply));
        return;
    }

    if (interaction.type === InteractionType.MessageComponent && interaction.data.component_type === ComponentType.Button) {
        const buttonInteraction = interaction as APIMessageComponentButtonInteraction;
        await handleButtonInteraction(buttonInteraction, new APIResponder(reply));
        return;
    }

    if (interaction.type === InteractionType.MessageComponent && interaction.data.component_type === ComponentType.StringSelect) {
        const selectInteraction = interaction as APIMessageComponentSelectMenuInteraction;
        await handleSelectInteraction(selectInteraction, new APIResponder(reply));
        return;
    }

    if (interaction.type === InteractionType.ModalSubmit) {
        const modalInteraction = interaction as APIModalSubmitInteraction;
        await handleModalInteraction(modalInteraction, new APIResponder(reply));
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

export class APIResponder {
    constructor(private reply: FastifyReply) {}
    newMessage(data: APIInteractionResponseCallbackData) {
        this.reply.send({ type: InteractionResponseType.ChannelMessageWithSource, data });
    }
    defer(data: APIInteractionResponseCallbackData) {
        this.reply.send({ type: InteractionResponseType.DeferredChannelMessageWithSource, data });
    }
    deferUpdate(data?: APIInteractionResponseCallbackData) {
        this.reply.send({ type: InteractionResponseType.DeferredMessageUpdate, data });
    }
    updateMessageText(data: string) {
        return this.updateMessage({ components: [new TextDisplayBuilder().setContent(data).toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
    updateMessage(data: APIInteractionResponseCallbackData) {
        this.reply.send({ type: InteractionResponseType.UpdateMessage, data });
    }
    modal(data: APIModalInteractionResponseCallbackData) {
        this.reply.send({ type: InteractionResponseType.Modal, data });
    }
}