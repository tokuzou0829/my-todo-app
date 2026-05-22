CREATE TABLE "subscription_label" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_label_assignment" (
	"subscription_id" text NOT NULL,
	"label_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_label_assignment_subscription_id_label_id_pk" PRIMARY KEY("subscription_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "subscription_label" ADD CONSTRAINT "subscription_label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_label_assignment" ADD CONSTRAINT "subscription_label_assignment_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_label_assignment" ADD CONSTRAINT "subscription_label_assignment_label_id_subscription_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."subscription_label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_label_userId_idx" ON "subscription_label" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_label_userId_name_idx" ON "subscription_label" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "subscription_label_assignment_labelId_idx" ON "subscription_label_assignment" USING btree ("label_id");