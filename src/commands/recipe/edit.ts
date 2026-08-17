import {
    SlashCommandBuilder,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    ModalBuilder,
    LabelBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    type APIMessageComponentButtonInteraction,
    type APIMessageComponentSelectMenuInteraction,
    type APIModalSubmitInteraction,
    SeparatorBuilder,
} from 'discord.js';
import type { APIChatInputApplicationCommandInteraction } from 'discord.js';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { recipes } from '../../db/schema.js';
import { getModalInputValue } from '../../client.js';
import { Command } from '../../command.js';
import type { Button, Modal, Select } from '../../command.js';
import type { APIResponder } from '../../server.js';

type ContainerMessageBuilder = (container: ContainerBuilder) => void;

interface BuildContainerMessageOptions {
    text?: string;
    row?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>;
    build?: ContainerMessageBuilder;
}

function buildContainerMessage(options: BuildContainerMessageOptions = {}) {
    const { text, row, build } = options;
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Edit Recipes"))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (build) {
        build(container);
    } else {
        if (text) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
        }

        if (row) {
            container.addActionRowComponents(row);
        }
    }

    return {
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
    };
}

function buildRecipeCard(recipe: { id: number; title: string; description: string | null }) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`recipe_edit:add_step:${recipe.id}`)
            .setLabel('Add Step')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`recipe_edit:finish:${recipe.id}`)
            .setLabel('Finish')
            .setStyle(ButtonStyle.Secondary),
    );

    const description = recipe.description?.trim() ? recipe.description : 'No description provided.';
    return buildContainerMessage({
        build: (container) => {
            container
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${recipe.title}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${description}`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);
        },
    });
}

async function getRecipeForGuild(guildId: string, recipeId: number) {
    const [recipe] = await db
        .select({ id: recipes.id, title: recipes.title, description: recipes.description })
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.guildId, guildId)))
        .limit(1);

    return recipe;
}

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
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('recipe_edit:new')
                .setLabel('New')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('recipe_edit:edit')
                .setLabel('Edit')
                .setStyle(ButtonStyle.Secondary),
        );

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
            .setCustomId('recipe_edit:new_modal')
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
            .setCustomId(`recipe_edit:edit_modal`)
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

        const matchingRecipes = await db
            .select({ id: recipes.id, title: recipes.title })
            .from(recipes)
            .where(and(
                eq(recipes.guildId, guildId),
                sql`lower(${recipes.title}) like ${`${recipePrefix}%`}`,
            ))
            .orderBy(asc(recipes.title))
            .limit(25);

        if (matchingRecipes.length === 0) {
            responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
            return;
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('recipe_edit:recipe_select')
            .setPlaceholder('Select a recipe to edit')
            .addOptions(
                matchingRecipes.map((recipe) => ({
                    label: recipe.title.slice(0, 100),
                    value: recipe.id.toString(),
                })),
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

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

        const [createdRecipe] = await db
            .insert(recipes)
            .values({
                guildId,
                title,
                description: description.length > 0 ? description : null,
                createdByUserId,
            })
            .returning({ id: recipes.id, title: recipes.title, description: recipes.description });

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