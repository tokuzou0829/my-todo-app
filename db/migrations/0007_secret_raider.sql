ALTER TABLE "subscription" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;