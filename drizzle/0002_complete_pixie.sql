PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_candidate_position_link` (
	`candidate_id` text PRIMARY KEY NOT NULL,
	`position_id` text
);
--> statement-breakpoint
INSERT INTO `__new_candidate_position_link`("candidate_id", "position_id") SELECT "candidate_id", "position_id" FROM `candidate_position_link`;--> statement-breakpoint
DROP TABLE `candidate_position_link`;--> statement-breakpoint
ALTER TABLE `__new_candidate_position_link` RENAME TO `candidate_position_link`;--> statement-breakpoint
PRAGMA foreign_keys=ON;