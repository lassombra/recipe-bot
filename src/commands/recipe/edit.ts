import {
    SlashCommandBuilder,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
    type APIMessageComponentButtonInteraction,
    type APIMessageComponentSelectMenuInteraction,
    type APIModalSubmitInteraction,
} from 'discord.js';
import type { APIChatInputApplicationCommandInteraction } from 'discord.js';
import { getModalInputValue } from '../../client.js';
import { Command } from '../../command.js';
import type { Button, Modal, Select } from '../../command.js';
import type { APIResponder } from '../../server.js';
import { EditRecipeCustomId } from './edit/ids.js';
import { buildContainerMessage, buildRecipeCard, buildRecipeSelectRow, buildStartRow } from './edit/display.js';
import { createRecipeForGuild, findRecipesForGuildPrefix, getRecipeForGuild } from './edit/data.js';

export class EditRecipe extends Command {
    data = new SlashCommandBuilder()
        .setName('edit-recipe')
        .setDescription('Edit a recipe')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]);
    buttonPrefix = 'recipe_edit';

    constructor() {
        super();
        this.registerButton(new NewRecipeButton());
        this.registerButton(new OpenEditRecipeModalButton());
        this.registerButton(new AddStepRecipeButton());
        this.registerButton(new FinishRecipeButton());
        this.registerModal(new EditRecipeModal());
        this.registerModal(new NewRecipeModal());
        this.registerSelect(new EditRecipeSelect());
    }

    protected async internalHandleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder): Promise<void> {
        const row = buildStartRow();

        responder.newMessage({
            ...buildContainerMessage({ text: 'What would you like to do?', row }),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    }
}

class NewRecipeButton implements Button {
    prefix = 'new';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(EditRecipeCustomId.NewModal)
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

class AddStepRecipeButton implements Button {
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

        responder.updateMessage(buildRecipeCard(recipe));
    }
}

class FinishRecipeButton implements Button {
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

class OpenEditRecipeModalButton implements Button {
    prefix = 'edit';

    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(EditRecipeCustomId.EditModal)
            .setTitle('Find Recipe To Edit')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Recipe Name')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('recipeName')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
            );

        responder.modal(modal.toJSON());
    }
}

class EditRecipeModal implements Modal {
    prefix = 'edit_modal';

    async handle(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
        const recipePrefix = (getModalInputValue(interaction.data.components, 'recipeName') ?? '').trim().toLowerCase();
        const guildId = interaction.guild_id;

        if (!guildId) {
            responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
            return;
        }

        const { results: matchingRecipes } = await findRecipesForGuildPrefix(guildId, recipePrefix, 1, 25);

        if (matchingRecipes.length === 0) {
            responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
            return;
        }

        const row = buildRecipeSelectRow(matchingRecipes);

        responder.updateMessage(buildContainerMessage({ text: 'Select a recipe:', row }));
    }
}

class NewRecipeModal implements Modal {
    prefix = 'new_modal';

    async handle(interaction: APIModalSubmitInteraction, responder: APIResponder): Promise<void> {
        const guildId = interaction.guild_id;
        const createdByUserId = interaction.member?.user.id;
        const title = (getModalInputValue(interaction.data.components, 'recipeTitle') ?? '').trim();
        const description = (getModalInputValue(interaction.data.components, 'recipeDescription') ?? '').trim();

        if (!guildId || !createdByUserId || !title) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not create recipe.' }));
            return;
        }

        const createdRecipe = await createRecipeForGuild(
            guildId,
            createdByUserId,
            title,
            description.length > 0 ? description : null,
        );

        if (!createdRecipe) {
            responder.updateMessage(buildContainerMessage({ text: 'Could not create recipe.' }));
            return;
        }

        responder.updateMessage(buildRecipeCard(createdRecipe));
    }
}

class EditRecipeSelect implements Select {
    prefix = 'recipe_select';

    async handle(interaction: APIMessageComponentSelectMenuInteraction, responder: APIResponder): Promise<void> {
        const guildId = interaction.guild_id;
        const selectedValue = interaction.data.values[0];

        if (!guildId || !selectedValue) {
            responder.updateMessage(buildContainerMessage({ text: 'Recipe not found.' }));
            return;
        }

        const recipeId = Number(selectedValue);
        if (!Number.isInteger(recipeId) || recipeId <= 0) {
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