PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_instruction_id` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`quantity_numerator` integer NOT NULL,
	`quantity_denominator` integer DEFAULT 1 NOT NULL,
	`unit` text NOT NULL,
	`preparation_note` text,
	`sequence_order` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`recipe_instruction_id`) REFERENCES `recipe_instructions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `recipe_ingredients`;--> statement-breakpoint
ALTER TABLE `__new_recipe_ingredients` RENAME TO `recipe_ingredients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;