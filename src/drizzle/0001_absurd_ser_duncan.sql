PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text,
	`name` text NOT NULL,
	`is_shared` integer DEFAULT false NOT NULL,
	`is_pending_approval` integer DEFAULT false NOT NULL,
	`submitted_by_user_id` text,
	`approved_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `bot_admin_users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_ingredients`("id", "guild_id", "name", "is_shared", "is_pending_approval", "submitted_by_user_id", "approved_by_user_id", "created_at") SELECT "id", "guild_id", "name", "is_shared", "is_pending_approval", "submitted_by_user_id", "approved_by_user_id", "created_at" FROM `ingredients`;--> statement-breakpoint
DROP TABLE `ingredients`;--> statement-breakpoint
ALTER TABLE `__new_ingredients` RENAME TO `ingredients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;