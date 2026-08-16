import {
    SlashCommandBuilder,
    InteractionContextType,
    ApplicationIntegrationType,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    LabelBuilder,
    type APIChatInputApplicationCommandInteraction,
    ContainerBuilder,
    TextDisplayBuilder,
    type APIMessageComponentButtonInteraction,
    SeparatorBuilder,
    type RESTPatchAPIChannelMessageJSONBody,
} from 'discord.js';
import { eq, and, inArray, count, or, isNull } from 'drizzle-orm';
import { Command, type Button } from '../../command.js';
import { db } from '../../db/index.js';
import { guildPermissions, ingredients } from '../../db/schema.js';
import { editResponse } from '../../client.js';
import type { APIResponder } from '../../server.js';

async function hasIngredientPermission(interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction): Promise<boolean> {
    if (!interaction.guild_id || !interaction.member) return false;

    if ((BigInt(interaction.member?.permissions ?? 0) & BigInt(PermissionFlagsBits.Administrator)) === BigInt(PermissionFlagsBits.Administrator)) return true;

    const roles = interaction.member.roles;
    if (roles.length === 0) return false;

    const matching = await db
        .select()
        .from(guildPermissions)
        .where(
            and(
                eq(guildPermissions.guildId, interaction.guild_id),
                eq(guildPermissions.permissionType, 'manage_recipes'),
                inArray(guildPermissions.roleId, roles),
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
    protected async isCommandAllowed(interaction: APIChatInputApplicationCommandInteraction) {
        return !!interaction.guild_id && hasIngredientPermission(interaction);
    }
    protected async isButtonAllowed(interaction: APIMessageComponentButtonInteraction) {
        return !!interaction.guild_id && hasIngredientPermission(interaction);
        return false;
    }
    protected async internalHandleCommand(interaction: APIChatInputApplicationCommandInteraction, responder: APIResponder) : Promise<void> {
        responder.defer({ flags: MessageFlags.Ephemeral });

        await editResponse(interaction, buildIngredientContainer(new TextDisplayBuilder()
                        .setContent('What would you like to do with ingredients?')));
        return;
    }
    protected disallowedMessage(interaction: APIChatInputApplicationCommandInteraction) {
        if (!interaction.guild_id) {
            return 'This command must be run from within a server.';
        } else {
            return 'You do not have permission to manage ingredients. You need the `manage_recipes` role permission or server administrator rights.';
        }
    }
    protected disallowedButtonMessage(interaction: APIMessageComponentButtonInteraction) {
        if (!interaction.guild_id) {
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
function buildIngredientContainer(...textDisplayBuilders: TextDisplayBuilder[]): RESTPatchAPIChannelMessageJSONBody {
    return {
        components: [new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("Ingredients Management")
        ).addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
        ).addTextDisplayComponents(
            ...textDisplayBuilders
        ).addActionRowComponents(
            baseButtonRow()
        ).toJSON()],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    };
}


class AddIngredientButton implements Button {
    buttonPrefix = 'add';
    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`ingredients:add_modal:${interaction.id}`)
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
        const displayedModal = responder.modal(modal.toJSON());
        return;
        // try {
        //     const response = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === `ingredients:add_modal${interaction.id}` });
        //     await response.deferUpdate();
        //     const ingredientName = response.fields.getTextInputValue('ingredientName');
        //     if (!ingredientName) {
        //         await interaction.editReply({ content: 'Ingredient name cannot be empty.'});
        //         return;
        //     }
        //     const [existing] = await db
        //         .select({ value: count() })
        //         .from(ingredients)
        //         .where(
        //             or(
        //                 and(
        //                     eq(ingredients.name, ingredientName),
        //                     eq(ingredients.guildId, interaction.guildId!),
        //                 ),
        //                 and(
        //                     eq(ingredients.name, ingredientName),
        //                     isNull(ingredients.guildId),
        //                     eq(ingredients.isShared, true)
        //                 )
        //             )
        //         );
        //     if (existing?.value ?? 0 > 0) {
        //         await interaction.editReply({ content: 'This ingredient already exists.', components: []});
        //         return;
        //     }
        //     await db.insert(ingredients).values({
        //         name: ingredientName,
        //         guildId: interaction.guildId,
        //         isShared: false,
        //         isPendingApproval: false
        //     });
        //     await interaction.editReply({ content: `Ingredient ${ingredientName} added successfully.`});
        // } catch (error) {
        //     await interaction.editReply({ content: 'An error occurred adding ingredient: Modal Timeout.', components: [] });
        // }
    }
}

class ListIngredients implements Button {
    buttonPrefix = 'list';
    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        responder.deferUpdate();

        const ingredientList = await db
            .select()
            .from(ingredients)
            .where(
                or(
                    eq(ingredients.guildId, interaction.guild_id!),
                    and(
                        isNull(ingredients.guildId),
                        eq(ingredients.isShared, true)
                    )
                )
            );

        const ingredientNames = ingredientList.map(i => `* ${i.name}`).join('\n') || 'No ingredients found.';
        console.log('Ingredient list fetched:', ingredientList);
        await editResponse(interaction, buildIngredientContainer(new TextDisplayBuilder()
                        .setContent('Here is the list of ingredients:'), new TextDisplayBuilder()
                        .setContent(ingredientNames)));
    }
}

class DeleteIngredients implements Button {
    buttonPrefix = 'delete';
    async handle(interaction: APIMessageComponentButtonInteraction, responder: APIResponder): Promise<void> {
        
    }
}