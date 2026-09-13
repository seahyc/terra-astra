CREATE TABLE `model_queries` (
	`query_hash` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `model_recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`hint` text NOT NULL,
	`recipe` text NOT NULL,
	`provenance` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_terms` (
	`term` text NOT NULL,
	`model_id` text NOT NULL,
	PRIMARY KEY(`term`, `model_id`),
	FOREIGN KEY (`model_id`) REFERENCES `model_recipes`(`id`) ON UPDATE no action ON DELETE no action
);
