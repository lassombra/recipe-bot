import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { ingredients, recipeIngredients, recipeInstructions, recipes } from '../../../db/schema.js';
import { formatQuantity, fromDbQuantity } from '../../../db/quantity.js';

export interface RecipeCardData {
    id: number;
    title: string;
    description: string | null;
    steps: RecipeStepData[];
}

export interface IngredientData {
    id: number;
    name: string;
    quantity: string;
    unit: string;
    preparation: string | null | undefined;
}

export interface RecipeStepData {
    id: number;
    recipeId: number;
    instruction: string;
    ingredients: IngredientData[];
}

export interface RecipeSelectOption {
    id: number;
    title: string;
}

export interface RecipeSearchPage {
    results: RecipeSelectOption[];
    totalCount: number;
}

export async function getRecipeForGuild(guildId: string, recipeId: number): Promise<RecipeCardData | undefined> {
    const [recipe] = await db
        .select({ id: recipes.id, title: recipes.title, description: recipes.description })
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.guildId, guildId)))
        .limit(1);
    const steps = await db
        .select({ id: recipeInstructions.id, recipeId: recipeInstructions.recipeId, instruction: recipeInstructions.instruction })
        .from(recipeInstructions)
        .where(eq(recipeInstructions.recipeId, recipeId))
        .orderBy(asc(recipeInstructions.id));
    const stepsWithIngredients = await Promise.all(
        steps.map(async (step) => {
            const ingredientsForStep = await db
                .select({ id: ingredients.id, name: ingredients.name, quantityNumerator: recipeIngredients.quantityNumerator, quantityDenominator: recipeIngredients.quantityDenominator, unit: recipeIngredients.unit, preparation: recipeIngredients.preparationNote })
                .from(recipeIngredients)
                .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
                .where(eq(recipeIngredients.recipeInstructionId, step.id));
            return { ...step, ingredients: ingredientsForStep.map(ingredient => ({
                id: ingredient.id,
                name: ingredient.name,
                quantity: formatQuantity(fromDbQuantity(ingredient.quantityNumerator, ingredient.quantityDenominator)),
                unit: ingredient.unit,
                preparation: ingredient.preparation,
            })) };
        })
    );
    if (!recipe) {
        return undefined;
    }
    return { ...recipe, steps: stepsWithIngredients };
}

export async function findRecipesForGuildPrefix(
    guildId: string,
    recipePrefix: string,
    page: number = 1,
    pageSize: number = 25,
): Promise<RecipeSearchPage> {
    const normalizedPrefix = recipePrefix.trim().toLowerCase();
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.floor(pageSize));

    if (!normalizedPrefix) {
        return { results: [], totalCount: 0 };
    }

    const [startsWithCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(recipes)
        .where(and(
            eq(recipes.guildId, guildId),
            sql`lower(${recipes.title}) like ${`${normalizedPrefix}%`}`,
        ));

    const startsWithCount = Number(startsWithCountRow?.count ?? 0);

    const [containsCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(recipes)
        .where(and(
            eq(recipes.guildId, guildId),
            sql`lower(${recipes.title}) like ${`%${normalizedPrefix}%`}`,
            sql`lower(${recipes.title}) not like ${`${normalizedPrefix}%`}`,
        ));

    const containsCount = Number(containsCountRow?.count ?? 0);
    const totalCount = startsWithCount + containsCount;

    if (totalCount === 0) {
        return { results: [], totalCount: 0 };
    }

    const offset = (safePage - 1) * safePageSize;
    if (offset >= totalCount) {
        return { results: [], totalCount };
    }

    const results: RecipeSelectOption[] = [];

    if (offset < startsWithCount) {
        const startsLimit = Math.min(safePageSize, startsWithCount - offset);
        const startsWithMatches = await db
            .select({ id: recipes.id, title: recipes.title })
            .from(recipes)
            .where(and(
                eq(recipes.guildId, guildId),
                sql`lower(${recipes.title}) like ${`${normalizedPrefix}%`}`,
            ))
            .orderBy(asc(recipes.title))
            .limit(startsLimit)
            .offset(offset);

        results.push(...startsWithMatches);
    }

    const remainingSlots = safePageSize - results.length;
    if (remainingSlots > 0) {
        const containsOffset = Math.max(0, offset - startsWithCount);
        const containsMatches = await db
            .select({ id: recipes.id, title: recipes.title })
            .from(recipes)
            .where(and(
                eq(recipes.guildId, guildId),
                sql`lower(${recipes.title}) like ${`%${normalizedPrefix}%`}`,
                sql`lower(${recipes.title}) not like ${`${normalizedPrefix}%`}`,
            ))
            .orderBy(asc(recipes.title))
            .limit(remainingSlots)
            .offset(containsOffset);

        results.push(...containsMatches);
    }

    return { results, totalCount };
}

export async function createRecipeForGuild(
    guildId: string,
    createdByUserId: string,
    title: string,
    description: string | null,
): Promise<RecipeCardData | undefined> {
    const [createdRecipe] = await db
        .insert(recipes)
        .values({
            guildId,
            title,
            description,
            createdByUserId,
        })
        .returning({ id: recipes.id, title: recipes.title, description: recipes.description });

    return createdRecipe ? await getRecipeForGuild(guildId, createdRecipe.id) : undefined;
}

export async function updateRecipeForGuild(
    guildId: string,
    recipeId: number,
    title: string,
    description: string | null,
): Promise<RecipeCardData | undefined> {
    const [updatedRecipe] = await db
        .update(recipes)
        .set({
            title,
            description,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(recipes.id, recipeId), eq(recipes.guildId, guildId)))
        .returning({ id: recipes.id, title: recipes.title, description: recipes.description });

    return updatedRecipe ? await getRecipeForGuild(guildId, updatedRecipe.id) : undefined;
}

export async function addStepToRecipe(
    recipeId: number,
    instruction: string,
): Promise<RecipeStepData | undefined> {
    const steps = await db
        .select({ id: recipeInstructions.id, instruction: recipeInstructions.instruction })
        .from(recipeInstructions)
        .where(eq(recipeInstructions.recipeId, recipeId));
    const stepNumber = steps.length + 1;
    const [createdStep] = await db
        .insert(recipeInstructions)
        .values({
            recipeId,
            instruction,
            stepNumber,
        })
        .returning({ id: recipeInstructions.id, instruction: recipeInstructions.instruction });
    if (!createdStep) {
        return undefined;
    }
    return {
        id: createdStep.id,
        instruction: createdStep.instruction,
        recipeId: recipeId,
        ingredients: [], // Initialize with an empty array or fetch existing ingredients if needed
    };
}

export async function updateStep(
    id: number,
    instruction: string,
): Promise<RecipeStepData | undefined> {
    const [updatedStep] = await db
        .update(recipeInstructions)
        .set({
            instruction,
        })
        .where(eq(recipeInstructions.id, id))
        .returning({ id: recipeInstructions.id, instruction: recipeInstructions.instruction, recipeId: recipeInstructions.recipeId });

    if (!updatedStep) {
        return undefined;
    }

    const ingredientEntries = await db
        .select({ id: recipeIngredients.id, 
            quantityNumerator: recipeIngredients.quantityNumerator, 
            quantityDenominator: recipeIngredients.quantityDenominator,
            unit: recipeIngredients.unit,
            ingredientId: recipeIngredients.ingredientId,
            preparation: recipeIngredients.preparationNote,
            name: ingredients.name,
         })
        .from(recipeIngredients)
        .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
        .where(eq(recipeIngredients.recipeInstructionId, updatedStep.id));
    const mappedIngredients = ingredientEntries.map(entry => ({
        ...entry,
        quantity: formatQuantity(fromDbQuantity(entry.quantityNumerator, entry.quantityDenominator)),
    }));

    return {
        id: updatedStep.id,
        instruction: updatedStep.instruction,
        recipeId: updatedStep.recipeId,
        ingredients: mappedIngredients, // Initialize with an empty array or fetch existing ingredients if needed
    };
}