import type { APIModalSubmitInteraction } from "discord.js";
import { getModalInputValue, editResponse } from "../../../client.js";
import type { Modal } from "../../../command.js";
import type { APIResponder } from "../../../server.js";
import { addStepToRecipe, createRecipeForGuild, getRecipeForGuild, updateRecipeForGuild } from "./data.js";
import { buildContainerMessage, buildRecipeCard, buildStepCard } from "./display.js";
import { buildRecipeNotFoundWithStartActions, updateRecipeSearchResults } from "../edit.js";


export class StepModal implements Modal {
    prefix = 'step_modal';

    async handle(interaction: APIModalSubmitInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        if (!guildId || !customData) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not add step.' }));
            return;
        }

        const recipeId = Number(customData.split('~')[0]);
        if (!Number.isInteger(recipeId) || recipeId <= 0) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not add step.' }));
            return;
        }

        const stepInstruction = getModalInputValue(interaction.data.components, 'stepInstruction');
        if (!stepInstruction) {
            responder.updateMessage(buildContainerMessage({ text: 'Step instruction is required.' }));
            return;
        }

        responder.deferUpdate();
        const createdStep = await addStepToRecipe(recipeId, stepInstruction);
        if (!createdStep) {
            editResponse(interaction, buildContainerMessage({ text: 'Could not add step.' }));
            return;
        }
        
        editResponse(interaction, buildStepCard(createdStep));
    }
}
export class NewRecipeModal implements Modal {
    prefix = 'new_modal';

    async handle(interaction: APIModalSubmitInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const title = (getModalInputValue(interaction.data.components, 'recipeTitle') ?? '').trim();
        const description = (getModalInputValue(interaction.data.components, 'recipeDescription') ?? '').trim();
        const descriptionOrNull = description.length > 0 ? description : null;

        if (!guildId || !title) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not create recipe.' }));
            return;
        }

        if (customData !== undefined) {
            const recipeId = Number(customData);
            if (!Number.isInteger(recipeId) || recipeId <= 0) {
                responder.updateMessage(buildRecipeNotFoundWithStartActions());
                return;
            }

            const updatedRecipe = await updateRecipeForGuild(guildId, recipeId, title, descriptionOrNull);
            if (!updatedRecipe) {
                responder.updateMessage(buildRecipeNotFoundWithStartActions());
                return;
            }

            responder.updateMessage(buildRecipeCard(updatedRecipe));
            return;
        }

        const createdByUserId = interaction.member?.user.id;
        if (!createdByUserId) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not create recipe.' }));
            return;
        }

        const createdRecipe = await createRecipeForGuild(guildId, createdByUserId, title, descriptionOrNull);
        if (!createdRecipe) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not create recipe.' }));
            return;
        }

        responder.updateMessage(buildRecipeCard(createdRecipe));
    }
}

export class EditRecipeModal implements Modal {
    prefix = 'edit_modal';

    async handle(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
        const recipePrefix = (getModalInputValue(interaction.data.components, 'recipeName') ?? '').trim().toLowerCase();
        const guildId = interaction.guild_id;

        if (!guildId) {
            responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
            return;
        }

        await updateRecipeSearchResults(responder, guildId, recipePrefix, 1);
    }
}

