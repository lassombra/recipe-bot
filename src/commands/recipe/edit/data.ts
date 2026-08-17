import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { recipes } from '../../../db/schema.js';

export interface RecipeCardData {
    id: number;
    title: string;
    description: string | null;
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

    return recipe;
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

    return createdRecipe;
}