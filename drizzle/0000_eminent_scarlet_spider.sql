CREATE TABLE `ballot` (
	`id` text PRIMARY KEY NOT NULL,
	`voter_id` text NOT NULL,
	`position` text NOT NULL,
	`preferences` blob NOT NULL,
	`submitted` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`voter_id`) REFERENCES `voter`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `candidate_position_link` (
	`candidate_id` text PRIMARY KEY NOT NULL,
	`position_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` text PRIMARY KEY NOT NULL,
	`election` text NOT NULL,
	`name` text NOT NULL,
	`statement` text,
	`avatar` text,
	FOREIGN KEY (`election`) REFERENCES `election`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `election` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nomination_start` integer NOT NULL,
	`nomination_end` integer NOT NULL,
	`voting_start` integer NOT NULL,
	`voting_end` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `position` (
	`id` text PRIMARY KEY NOT NULL,
	`election_id` text NOT NULL,
	`name` text NOT NULL,
	`vacancies` integer NOT NULL,
	`description` text NOT NULL,
	`executive` integer NOT NULL,
	FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voter` (
	`id` text PRIMARY KEY NOT NULL,
	`election` text NOT NULL,
	`student_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`election`) REFERENCES `election`(`id`) ON UPDATE no action ON DELETE no action
);
