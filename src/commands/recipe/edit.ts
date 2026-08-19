import {
    SlashCommandBuilder,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType,
    type APIMessageComponentSelectMenuInteraction,
} from 'discord.js';
import type { APIChatInputApplicationCommandInteraction } from 'discord.js';
import { Command } from '../../command.js';
import type { Select } from '../../command.js';
import type { APIResponder } from '../../server.js';
import { buildContainerMessage, buildRecipeCard, buildRecipeSearchResultsMessage, buildStartRow } from './edit/display.js';
import { findRecipesForGuildPrefix, getRecipeForGuild } from './edit/data.js';
import { EditRecipeModal, NewRecipeModal, StepModal } from './edit/modalHandlers.js';
import { AddStepRecipeButton, DeleteStepButton, EditStepRecipeButton, FinishRecipeButton, MoreRecipeResultsButton, NewRecipeButton, OpenEditRecipeModalButton } from './edit/buttonHandlers.js';

const RECIPE_SEARCH_PAGE_SIZE = 25;

export function buildRecipeNotFoundWithStartActions() {
    return buildContainerMessage({ text: 'Recipe not found', row: buildStartRow() });
}

function makeMoreCustomData(recipePrefix: string, nextPage: number): string {
    return `${encodeURIComponent(recipePrefix)}~${nextPage}`;
}

export function parseMoreCustomData(customData?: string): { recipePrefix: string; page: number } | null {
    if (!customData) return null;
    const separatorIndex = customData.lastIndexOf('~');
    if (separatorIndex <= 0) return null;

    const encodedPrefix = customData.slice(0, separatorIndex);
    const pageText = customData.slice(separatorIndex + 1);
    const page = Number(pageText);

    if (!Number.isInteger(page) || page < 1) return null;

    try {
        const recipePrefix = decodeURIComponent(encodedPrefix).trim().toLowerCase();
        if (!recipePrefix) return null;
        return { recipePrefix, page };
    } catch {
        return null;
    }
}

export async function updateRecipeSearchResults(responder: APIResponder, guildId: string, recipePrefix: string, page: number): Promise<void> {
    const { results, totalCount } = await findRecipesForGuildPrefix(guildId, recipePrefix, page, RECIPE_SEARCH_PAGE_SIZE);
    if (results.length === 0) {
        responder.updateMessage(buildContainerMessage({ text: 'no recipe found' }));
        return;
    }

    const hasMore = page * RECIPE_SEARCH_PAGE_SIZE < totalCount;
    const moreCustomData = hasMore ? makeMoreCustomData(recipePrefix, page + 1) : undefined;
    responder.updateMessage(buildRecipeSearchResultsMessage(results, hasMore, moreCustomData));
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
        this.registerButtons([
            new NewRecipeButton(),
            new OpenEditRecipeModalButton(),
            new AddStepRecipeButton(),
            new MoreRecipeResultsButton(),
            new FinishRecipeButton(),
            new EditStepRecipeButton(),
            new DeleteStepButton(),
        ]);
        this.registerModals([
            new EditRecipeModal(),
            new NewRecipeModal(),
            new StepModal(),
        ]);
        this.registerSelects([
            new EditRecipeSelect(),
        ]);
    }

    protected async internalHandleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder): Promise<void> {
        const row = buildStartRow();
        responder.newMessage({
            ...buildContainerMessage({ text: 'What would you like to do?', row }),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
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