import { ComponentType, MessageFlags, REST, Routes, TextDisplayBuilder} from 'discord.js';
import type { 
    APIChatInputApplicationCommandInteraction, 
    APIMessageComponentButtonInteraction, 
    APIModalSubmissionComponent, 
    APIModalSubmitInteraction, 
    APIModalSubmitTextInputComponent, 
    RESTPatchAPIWebhookWithTokenMessageJSONBody
} from 'discord.js';

let rest: REST | undefined;

function initialize() {
    if (!rest) {
        rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    }
    return rest;
}

export async function editResponseText(originalInteraction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction | APIModalSubmitInteraction, content: string) {
    return editResponse(originalInteraction, { components: [new TextDisplayBuilder().setContent(content).toJSON()], flags: MessageFlags.IsComponentsV2 });
}
export async function editResponse(originalInteraction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction | APIModalSubmitInteraction, content: RESTPatchAPIWebhookWithTokenMessageJSONBody) {
    const restClient = initialize();
    try {
        return await restClient.patch(
            Routes.webhookMessage(originalInteraction.application_id, originalInteraction.token, '@original'),
            { body: content}
        );
    } catch (error) {
        console.error('Error editing response:', error);
    }
}

export function getModalInputValue(
    components: APIModalSubmissionComponent[],
    customId: string
): string | undefined {
    for (const row of components) {
        if (row.type === ComponentType.ActionRow) {
            console.log('searching', row, 'for customId:', customId);
            for (const component of row.components) {
                if (component.type === ComponentType.TextInput && component.custom_id === customId) {
                    return component.value;
                }
            }
        } else if (row.type === ComponentType.Label) {
            const component = row.component;
            if (component.type === ComponentType.TextInput && component.custom_id === customId) {
                return component.value;
            }
        }
    }
    return undefined;
}