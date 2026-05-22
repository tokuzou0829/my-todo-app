ALTER TABLE "todo" ADD COLUMN "priority" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "due_at" timestamp;