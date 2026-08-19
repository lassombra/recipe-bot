import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type APIMessageComponentButtonInteraction } from "discord.js";
import type { APIResponder } from "../../../server.js";
import type { Button } from "../../../command.js";
import { EditRecipeCustomId } from "./ids.js";
import { buildRecipeNotFoundWithStartActions, parseMoreCustomData, updateRecipeSearchResults } from "../edit.js";
import { deleteRecipeStep, getRecipeForGuild } from "./data.js";
import { buildContainerMessage, buildRecipeCard, buildStartRow, buildStepCard } from "./display.js";
import { editResponse } from "../../../client.js";

export class NewRecipeButton implements Button {
    prefix = 'new';

    async handle(_interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const isNew = !customData;
        const title = isNew ? 'Create New Recipe' : 'Edit Recipe'; 
        const id = isNew ? '' : customData;
        const recipe = isNew ? null : await getRecipeForGuild(_interaction.guild_id!, Number(customData), true);
        const modal = new ModalBuilder()
            .setCustomId(`${EditRecipeCustomId.RecipeHeaderModal}${isNew ? '' : `:${id}`}`) //postpends id if provided
            .setTitle(title)
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Recipe Title')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeTitle')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(recipe?.title ?? ''),
                    ),
                new LabelBuilder()
                    .setLabel('Description')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeDescription')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setValue(recipe?.description ?? ''),
                    ),
            );
        responder.modal(modal.toJSON());
    }
}

export class OpenEditRecipeModalButton implements Button {
    prefix = 'edit';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const recipeId = Number(customData ?? '0');
        const recipe = recipeId > 0 ? await getRecipeForGuild(interaction.guild_id!, recipeId, true) : null;
        if (recipeId == 0) {
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
        } else if (!recipe) {
            responder.updateMessage(buildRecipeNotFoundWithStartActions());
        } else {
            responder.deferUpdate();
            const fullRecipe = await getRecipeForGuild(interaction.guild_id!, recipeId);
            if (!fullRecipe) {
                editResponse(interaction, buildRecipeNotFoundWithStartActions());
                return;
            }
            editResponse(interaction, buildRecipeCard(fullRecipe));
        }
    }
}
export class EditStepRecipeButton implements Button {
    prefix = 'edit_step';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const stepId = Number((customData ?? '').split('~')[1] ?? '0');
        const recipeId = Number((customData ?? '').split('~')[0] ?? '0');

        if (!guildId || !Number.isInteger(stepId) || stepId <= 0 || !Number.isInteger(recipeId) || recipeId <= 0) {
            responder.updateMessage(buildContainerMessage({ text: 'Step/Recipe not found.' }));
            return;
        }
        responder.deferUpdate();
        const recipe = await getRecipeForGuild(guildId, recipeId);
        if (!recipe) {
            editResponse(interaction, buildContainerMessage({ text: 'Step/Recipe not found.' }));
            return;
        }
        const step = recipe.steps.find(s => s.id === stepId);
        if (!step) {
            editResponse(interaction, buildContainerMessage({ text: 'Step/Recipe not found.' }));
            return;
        }
        editResponse(interaction, buildStepCard(step));
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

        if (!guildId) {
            responder.updateMessage(buildContainerMessage({ text: 'This command must be conducted in a guild.' }));
            return;
        }

        responder.updateMessage(buildContainerMessage({ text: 'What would you like to do?', row: buildStartRow() }));
    }
}

export class DeleteStepButton implements Button {
    prefix = 'delete_step';
    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder, customData?: string): Promise<void> {
        const guildId = interaction.guild_id;
        const [recipeIdStr, stepIdStr] = (customData ?? '').split('~');
        const recipeId = Number(recipeIdStr);
        const stepId = Number(stepIdStr);

        if (!guildId || !Number.isInteger(recipeId) || recipeId <= 0 || !Number.isInteger(stepId) || stepId <= 0) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe or step not found.' }));
            return;
        }

        const recipe = await getRecipeForGuild(guildId, recipeId, true);
        if (!recipe) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }
        responder.deferUpdate();
        
        const deletedStepNumber = await deleteRecipeStep(guildId, recipeId, stepId);
        const updatedRecipe = (await getRecipeForGuild(guildId, recipeId))!;

        if (updatedRecipe.steps.find(step => step.stepNumber === deletedStepNumber)) {
            editResponse(interaction, buildStepCard(updatedRecipe.steps.find(step => step.stepNumber === deletedStepNumber)!));
        } else {
            editResponse(interaction, buildRecipeCard(updatedRecipe));
        }
    }
}