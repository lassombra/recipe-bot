import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql, relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// --- GUILD PERMISSIONS ---
export const guildPermissions = sqliteTable('guild_permissions', {
  guildId: text('guild_id').notNull(),
  roleId: text('role_id').notNull(),
  permissionType: text('permission_type', { 
    enum: ['manage_recipes', 'manage_shopping'] 
  }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.guildId, table.roleId, table.permissionType] }),
}));

// --- BOT ADMIN USERS ---
export const botAdminUsers = sqliteTable('bot_admin_users', {
  userId: text('user_id').primaryKey(), // Discord User ID
  grantedAt: text('granted_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- INGREDIENTS ---
export const ingredients = sqliteTable('ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id'), // NULL if shared/global
  name: text('name').notNull(),
  isShared: integer('is_shared', { mode: 'boolean' }).default(false).notNull(),
  isPendingApproval: integer('is_pending_approval', { mode: 'boolean' }).default(false).notNull(),
  submittedByUserId: text('submitted_by_user_id'),
  approvedByUserId: text('approved_by_user_id').references(() => botAdminUsers.userId),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- RECIPES ---
export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- RECIPE INSTRUCTIONS ---
export const recipeInstructions = sqliteTable('recipe_instructions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  instruction: text('instruction').notNull(),
});

// --- RECIPE INGREDIENTS (Junction Table allowing duplicates) ---
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeInstructionId: integer('recipe_instruction_id')
    .notNull()
    .references(() => recipeInstructions.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id')
    .notNull()
    .references(() => ingredients.id),
  quantityNumerator: integer('quantity_numerator').notNull(),
  quantityDenominator: integer('quantity_denominator').notNull().default(1),
  unit: text('unit').notNull(),
  preparationNote: text('preparation_note'),
  sequenceOrder: integer('sequence_order').default(1).notNull(),
});

// --- SCHEDULED RECIPES (Shopping & History State Machine) ---
export const scheduledRecipes = sqliteTable('scheduled_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull(),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  scheduledDate: text('scheduled_date').notNull(), // Store as YYYY-MM-DD
  status: text('status', { 
    enum: ['scheduled', 'shopped', 'made', 'cancelled'] 
  }).default('scheduled').notNull(),
  scheduledByUserId: text('scheduled_by_user_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- DRIZZLE RELATIONS ---

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  approver: one(botAdminUsers, {
    fields: [ingredients.approvedByUserId],
    references: [botAdminUsers.userId],
  }),
  recipeIngredients: many(recipeIngredients),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  instructions: many(recipeInstructions),
  recipeIngredients: many(recipeIngredients),
  schedules: many(scheduledRecipes),
}));

export const recipeInstructionsRelations = relations(recipeInstructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeInstructions.recipeId],
    references: [recipes.id],
  }),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipeInstruction: one(recipeInstructions, {
    fields: [recipeIngredients.recipeInstructionId],
    references: [recipeInstructions.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

export const scheduledRecipesRelations = relations(scheduledRecipes, ({ one }) => ({
  recipe: one(recipes, {
    fields: [scheduledRecipes.recipeId],
    references: [recipes.id],
  }),
}));

// --- INFERRED TS TYPES ---

export type GuildPermission = InferSelectModel<typeof guildPermissions>;
export type NewGuildPermission = InferInsertModel<typeof guildPermissions>;

export type BotAdminUser = InferSelectModel<typeof botAdminUsers>;
export type NewBotAdminUser = InferInsertModel<typeof botAdminUsers>;

export type Ingredient = InferSelectModel<typeof ingredients>;
export type NewIngredient = InferInsertModel<typeof ingredients>;

export type Recipe = InferSelectModel<typeof recipes>;
export type NewRecipe = InferInsertModel<typeof recipes>;

export type RecipeInstruction = InferSelectModel<typeof recipeInstructions>;
export type NewRecipeInstruction = InferInsertModel<typeof recipeInstructions>;

export type RecipeIngredient = InferSelectModel<typeof recipeIngredients>;
export type NewRecipeIngredient = InferInsertModel<typeof recipeIngredients>;

export type ScheduledRecipe = InferSelectModel<typeof scheduledRecipes>;
export type NewScheduledRecipe = InferInsertModel<typeof scheduledRecipes>;