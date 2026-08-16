import { REST, Routes, type APIChatInputApplicationCommandInteraction, type APIMessageComponentButtonInteraction, type RESTPatchAPIWebhookWithTokenMessageJSONBody } from 'discord.js';

let rest: REST | undefined;

function initialize() {
    if (!rest) {
       rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    }
    return rest;
}

export function editResponse(originalInteraction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction, content: RESTPatchAPIWebhookWithTokenMessageJSONBody) {
    const restClient = initialize();
    console.log('Editing response with content:', content);
    console.log({body: JSON.stringify(content)})
    return restClient.patch(
        Routes.webhookMessage(originalInteraction.application_id, originalInteraction.token, '@original'),
        { body: content}
    );
}