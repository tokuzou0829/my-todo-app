CREATE TABLE "finance_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'JPY' NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"payment_method" text DEFAULT 'other' NOT NULL,
	"merchant" text,
	"memo" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_entry_tag_assignment" (
	"entry_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "finance_entry_tag_assignment_entry_id_tag_id_pk" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "finance_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_entry" ADD CONSTRAINT "finance_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry_tag_assignment" ADD CONSTRAINT "finance_entry_tag_assignment_entry_id_finance_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."finance_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry_tag_assignment" ADD CONSTRAINT "finance_entry_tag_assignment_tag_id_finance_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."finance_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_tag" ADD CONSTRAINT "finance_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "finance_entry_userId_idx" ON "finance_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "finance_entry_userId_occurredAt_idx" ON "finance_entry" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "finance_entry_tag_assignment_tagId_idx" ON "finance_entry_tag_assignment" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "finance_tag_userId_idx" ON "finance_tag" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_tag_userId_name_idx" ON "finance_tag" USING btree ("user_id","name");