import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type APIMessageComponentButtonInteraction } from "discord.js";
import type { APIResponder } from "../../../server.js";
import type { Button } from "../../../command.js";
import { EditRecipeCustomId } from "./ids.js";
import { buildRecipeNotFoundWithStartActions, parseMoreCustomData, updateRecipeSearchResults } from "../edit.js";
import { getRecipeForGuild } from "./data.js";
import { buildContainerMessage, buildRecipeCard } from "./display.js";

export class NewRecipeButton implements Button {
    prefix = 'new';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(EditRecipeCustomId.RecipeHeaderModal)
            .setTitle('Create New Recipe')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Recipe Title')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeTitle')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
                new LabelBuilder()
                    .setLabel('Description')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeDescription')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false),
                    ),
            );

        responder.modal(modal.toJSON());
    }
}

export class OpenEditRecipeModalButton implements Button {
    prefix = 'edit';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(EditRecipeCustomId.RecipeSearchModal)
            .setTitle('Find Recipe To Edit')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Recipe Name')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeName')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
            );

        responder.modal(modal.toJSON());
    }
}
export class EditRecipeDetailsButton implements Button {
    prefix = 'edit_details';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const recipeId = Number(customData);

        if (!guildId || !Number.isInteger(recipeId) || recipeId <= 0) {
            responder.updateMessage(buildRecipeNotFoundWithStartActions());
            return;
        }

        const recipe = await getRecipeForGuild(guildId, recipeId);
        if (!recipe) {
            responder.updateMessage(buildRecipeNotFoundWithStartActions());
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`${EditRecipeCustomId.RecipeHeaderModal}:${recipe.id}`)
            .setTitle('Edit Recipe Details')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Recipe Title')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeTitle')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(recipe.title)
                    ),
                new LabelBuilder()
                    .setLabel('Description')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeDescription')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setValue(recipe.description ?? '')
                    )
            );

        responder.modal(modal.toJSON());
    }
}

export class AddStepRecipeButton implements Button {
    prefix = 'add_step';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const recipeId = Number(customData);

        if (!guildId || !Number.isInteger(recipeId) || recipeId <= 0) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }

        const recipe = await getRecipeForGuild(guildId, recipeId);
        if (!recipe) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }
        const modal = new ModalBuilder()
            .setCustomId(`${EditRecipeCustomId.StepModal}:${recipe.id}`)
            .setTitle('Add Recipe Step')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Step Instruction')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('stepInstruction')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
            );
        responder.modal(modal.toJSON());
    }
}

export class MoreRecipeResultsButton implements Button {
    prefix = 'more';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const parsed = parseMoreCustomData(customData);

        if (!guildId || !parsed) {
            responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
            return;
        }

        await updateRecipeSearchResults(responder, guildId, parsed.recipePrefix, parsed.page);
    }
}

export class FinishRecipeButton implements Button {
    prefix = 'finish';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const recipeId = Number(customData);

        if (!guildId || !Number.isInteger(recipeId) || recipeId <= 0) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }

        const recipe = await getRecipeForGuild(guildId, recipeId);
        if (!recipe) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }

        responder.updateMessage(buildRecipeCard(recipe));
    }
}

