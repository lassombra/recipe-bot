import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} from 'discord.js';
import { EditRecipeCustomId } from './ids.js';
import type { RecipeCardData, RecipeSelectOption } from './data.js';

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

export function buildRecipeCard(recipe: RecipeCardData) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.AddStepButtonPrefix}:${recipe.id}`)
            .setLabel('Add Step')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`${EditRecipeCustomId.FinishButtonPrefix}:${recipe.id}`)
            .setLabel('Finish')
            .setStyle(ButtonStyle.Secondary),
    );

    const description = recipe.description?.trim() ? recipe.description : 'No description provided.';
    return buildContainerMessage({
        build: (container) => {
            container
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${recipe.title}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);
        },
    });
}