import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} from 'discord.js';
import { EditRecipeCustomId } from './ids.js';
import type { RecipeCardData, RecipeSelectOption, RecipeStepData } from './data.js';

type ContainerMessageBuilder = (container: ContainerBuilder) => void;

interface BuildContainerMessageOptions {
    text?: string;
    row?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>;
    build?: ContainerMessageBuilder;
}

export function buildContainerMessage(options: BuildContainerMessageOptions = {}) {
    const { text, row, build } = options;
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Edit Recipes'))
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

export function buildStartRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(EditRecipeCustomId.NewButton)
            .setLabel('New')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(EditRecipeCustomId.EditButton)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary),
    );
}

export function buildRecipeSelectRow(options: RecipeSelectOption[]) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(EditRecipeCustomId.RecipeSelect)
        .setPlaceholder('Select a recipe to edit')
        .addOptions(
            options.map((recipe) => ({
                label: recipe.title.slice(0, 100),
                value: recipe.id.toString(),
            })),
        );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildMoreResultsRow(customData: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.MoreButtonPrefix}:${customData}`)
            .setLabel('More')
            .setStyle(ButtonStyle.Secondary),
    );
}

export function buildRecipeSearchResultsMessage(
    options: RecipeSelectOption[],
    hasMore: boolean,
    moreCustomData?: string,
) {
    const selectRow = buildRecipeSelectRow(options);

    return buildContainerMessage({
        build: (container) => {
            container
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Select a recipe:'))
                .addActionRowComponents(selectRow);

            if (hasMore && moreCustomData) {
                container.addActionRowComponents(buildMoreResultsRow(moreCustomData));
            }
        },
    });
}

export function buildRecipeCard(recipe: RecipeCardData) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.NewButton}:${recipe.id}`)
            .setLabel('Edit Details')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.AddStepButtonPrefix}:${recipe.id}`)
            .setLabel('Add Step')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.FinishButtonPrefix}`)
            .setLabel('Finish')
            .setStyle(ButtonStyle.Secondary),
    );

    const description = recipe.description?.trim() ? recipe.description : 'No description provided.';
    const steps = recipe.steps.map((step, index) => new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Step ${index + 1}: ${step.instruction}`)
        ).setButtonAccessory(
            new ButtonBuilder()
                .setCustomId(`${EditRecipeCustomId.EditStepButton}:${recipe.id}~${step.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Edit')
        )
    );
    return buildContainerMessage({
        build: (container) => {
            container = container
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${recipe.title}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
            if (steps.length > 0) {
                container = container.addSectionComponents(steps);
            }            
            container = container
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);
        },
    });
}

export function buildStepCard(step: RecipeStepData) {
    return buildContainerMessage({
        build: (container) => {
            if (step.ingredients && step.ingredients.length > 0) {
                container.addTextDisplayComponents(step.ingredients.map(ingredient => 
                    new TextDisplayBuilder().setContent(`- ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}${ingredient.preparation ? ` (${ingredient.preparation})` : ''}`)
                ))
            }
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(step.instruction));
            container.addActionRowComponents(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${EditRecipeCustomId.EditButton}:${step.recipeId}`)
                        .setLabel('Back To Recipe')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${EditRecipeCustomId.AddStepButtonPrefix}:${step.recipeId}`)
                        .setLabel('Next Step')
                        .setStyle(ButtonStyle.Primary),
                )
            );
        }
    })
}