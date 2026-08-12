import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    InteractionContextType,
    ApplicationIntegrationType,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ButtonInteraction,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    LabelBuilder,
} from 'discord.js';
import { eq, and, inArray, count, or, isNull } from 'drizzle-orm';
import { Command, type Button } from '../../command.js';
import { db } from '../../db/index.js';
import { guildPermissions, ingredients } from '../../db/schema.js';

async function hasIngredientPermission(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<boolean> {
    if (!interaction.guildId || !interaction.member) return false;

    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;

    const roles = interaction.member.roles;
    const roleIds: string[] = Array.isArray(roles) ? roles : [...roles.cache.keys()];
    if (roleIds.length === 0) return false;

    const matching = await db
        .select()
        .from(guildPermissions)
        .where(
            and(
                eq(guildPermissions.guildId, interaction.guildId),
                eq(guildPermissions.permissionType, 'manage_recipes'),
                inArray(guildPermissions.roleId, roleIds),
            ),
        );

    return matching.length > 0;
}

export class Ingredients extends Command {
    data = new SlashCommandBuilder()
        .setName('ingredients')
        .setDescription('Manage ingredients')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]);
    buttonPrefix = 'ingredients';
    constructor() {
        super();
        this.buttons.set('add', new AddIngredientButton());
        this.buttons.set('list', new ListIngredients());
    }
    protected async isCommandAllowed(interaction: ChatInputCommandInteraction) {
        return !!interaction.guildId && hasIngredientPermission(interaction);
    }
    protected async isButtonAllowed(interaction: ButtonInteraction) {
        return !!interaction.guildId && hasIngredientPermission(interaction);
    }
    protected async internalHandleCommand(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await interaction.editReply({
            content: 'What would you like to do with ingredients?',
            components: [baseButtonRow()],
        });
    }
    protected disallowedMessage(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            return 'This command must be run from within a server.';
        } else {
            return 'You do not have permission to manage ingredients. You need the `manage_recipes` role permission or server administrator rights.';
        }
    }
    protected disallowedButtonMessage(interaction: ButtonInteraction) {
        if (!interaction.guildId) {
            return 'This command must be run from within a server.';
        } else {
            return 'You do not have permission to manage ingredients. You need the `manage_recipes` role permission or server administrator rights.';
        }
    }
}

function baseButtonRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('ingredients:add')
            .setLabel('Add Ingredient')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ingredients:list')
            .setLabel('List Ingredients')
            .setStyle(ButtonStyle.Secondary),
    );
}

class AddIngredientButton implements Button {
    buttonPrefix = 'add';
    async handle(interaction: ButtonInteraction): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`ingredients:add_modal${interaction.id}`)
            .setTitle('Add Ingredient')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Ingredient Name')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('ingredientName')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
            );
        const displayedModal = await interaction.showModal(modal);
        try {
            const response = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === `ingredients:add_modal${interaction.id}` });
            await response.deferUpdate();
            const ingredientName = response.fields.getTextInputValue('ingredientName');
            if (!ingredientName) {
                await interaction.editReply({ content: 'Ingredient name cannot be empty.'});
                return;
            }
            const [existing] = await db
                .select({ value: count() })
                .from(ingredients)
                .where(
                    or(
                        and(
                            eq(ingredients.name, ingredientName),
                            eq(ingredients.guildId, interaction.guildId!),
                        ),
                        and(
                            eq(ingredients.name, ingredientName),
                            isNull(ingredients.guildId),
                            eq(ingredients.isShared, true)
                        )
                    )
                );
            if (existing?.value ?? 0 > 0) {
                await interaction.editReply({ content: 'This ingredient already exists.', components: []});
                return;
            }
            await db.insert(ingredients).values({
                name: ingredientName,
                guildId: interaction.guildId,
                isShared: false,
                isPendingApproval: false
            });
            await interaction.editReply({ content: `Ingredient ${ingredientName} added successfully.`});
        } catch (error) {
            await interaction.editReply({ content: 'An error occurred adding ingredient: Modal Timeout.', components: [] });
        }
    }
}

class ListIngredients implements Button {
    buttonPrefix = 'list';
    async handle(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate();

        const ingredientList = await db
            .select()
            .from(ingredients)
            .where(
                or(
                    eq(ingredients.guildId, interaction.guildId!),
                    and(
                        isNull(ingredients.guildId),
                        eq(ingredients.isShared, true)
                    )
                )
            );

        const ingredientNames = ingredientList.map(i => `* ${i.name}`).join('\n') || 'No ingredients found.';
        console.log('Ingredient list fetched:', ingredientList);
        await interaction.editReply({
            content: `Here is the list of ingredients:\n${ingredientNames}`,
        });
    }
}

class DeleteIngredients implements Button {
    buttonPrefix = 'delete';
    async handle(interaction: ButtonInteraction): Promise<void> {
        
    }
}