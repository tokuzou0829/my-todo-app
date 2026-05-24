CREATE TABLE "scrap" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"kind" text DEFAULT 'text' NOT NULL,
	"source_url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrap_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"scrap_id" text NOT NULL,
	"file_id" text NOT NULL,
	"alt_text" text,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrap_link_preview" (
	"id" text PRIMARY KEY NOT NULL,
	"scrap_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"site_name" text,
	"provider_name" text,
	"author_name" text,
	"html" text,
	"image_file_id" text,
	"image_alt" text,
	"metadata_source" text DEFAULT 'none' NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrap" ADD CONSTRAINT "scrap_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_attachment" ADD CONSTRAINT "scrap_attachment_scrap_id_scrap_id_fk" FOREIGN KEY ("scrap_id") REFERENCES "public"."scrap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_attachment" ADD CONSTRAINT "scrap_attachment_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_link_preview" ADD CONSTRAINT "scrap_link_preview_scrap_id_scrap_id_fk" FOREIGN KEY ("scrap_id") REFERENCES "public"."scrap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_link_preview" ADD CONSTRAINT "scrap_link_preview_image_file_id_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrap_userId_idx" ON "scrap" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scrap_userId_createdAt_idx" ON "scrap" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scrap_attachment_scrapId_idx" ON "scrap_attachment" USING btree ("scrap_id");--> statement-breakpoint
CREATE INDEX "scrap_attachment_fileId_idx" ON "scrap_attachment" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scrap_attachment_scrapId_position_idx" ON "scrap_attachment" USING btree ("scrap_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "scrap_link_preview_scrapId_idx" ON "scrap_link_preview" USING btree ("scrap_id");--> statement-breakpoint
CREATE INDEX "scrap_link_preview_imageFileId_idx" ON "scrap_link_preview" USING btree ("image_file_id");