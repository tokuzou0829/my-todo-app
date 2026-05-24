import { relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const files = pgTable("files", {
	id: text("id").primaryKey().notNull(),
	bucket: varchar("bucket", { length: 255 }).notNull(),
	key: varchar("key", { length: 1024 }).notNull(),
	contentType: varchar("content_type", { length: 255 }).notNull(),
	size: bigint("size", { mode: "number" }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const pushSubscription = pgTable(
	"push_subscription",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		expirationTime: bigint("expiration_time", { mode: "number" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("push_subscription_userId_idx").on(table.userId),
		uniqueIndex("push_subscription_userId_endpoint_idx").on(
			table.userId,
			table.endpoint,
		),
	],
);

export const apiKey = pgTable(
	"api_key",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		keyHash: text("key_hash").notNull(),
		keyPrefix: text("key_prefix").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		lastUsedAt: timestamp("last_used_at"),
		revokedAt: timestamp("revoked_at"),
	},
	(table) => [
		index("api_key_userId_idx").on(table.userId),
		uniqueIndex("api_key_keyHash_idx").on(table.keyHash),
	],
);

export const todo = pgTable(
	"todo",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		priority: text("priority").default("none").notNull(),
		dueAt: timestamp("due_at"),
		isPrivate: boolean("is_private").default(false).notNull(),
		completed: boolean("completed").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("todo_userId_idx").on(table.userId)],
);

export const scrap = pgTable(
	"scrap",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		body: text("body"),
		kind: text("kind").default("text").notNull(),
		sourceUrl: text("source_url"),
		isPrivate: boolean("is_private").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("scrap_userId_idx").on(table.userId),
		index("scrap_userId_createdAt_idx").on(table.userId, table.createdAt),
	],
);

export const scrapLinkPreview = pgTable(
	"scrap_link_preview",
	{
		id: text("id").primaryKey().notNull(),
		scrapId: text("scrap_id")
			.notNull()
			.references(() => scrap.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		title: text("title"),
		description: text("description"),
		siteName: text("site_name"),
		providerName: text("provider_name"),
		authorName: text("author_name"),
		html: text("html"),
		imageFileId: text("image_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		imageAlt: text("image_alt"),
		metadataSource: text("metadata_source").default("none").notNull(),
		rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("scrap_link_preview_scrapId_idx").on(table.scrapId),
		index("scrap_link_preview_imageFileId_idx").on(table.imageFileId),
	],
);

export const scrapAttachment = pgTable(
	"scrap_attachment",
	{
		id: text("id").primaryKey().notNull(),
		scrapId: text("scrap_id")
			.notNull()
			.references(() => scrap.id, { onDelete: "cascade" }),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		altText: text("alt_text"),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("scrap_attachment_scrapId_idx").on(table.scrapId),
		index("scrap_attachment_fileId_idx").on(table.fileId),
		uniqueIndex("scrap_attachment_scrapId_position_idx").on(
			table.scrapId,
			table.position,
		),
	],
);

export const subscription = pgTable(
	"subscription",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
		currency: text("currency").default("JPY").notNull(),
		billingIntervalUnit: text("billing_interval_unit").notNull(),
		billingIntervalCount: integer("billing_interval_count")
			.default(1)
			.notNull(),
		nextPaymentAt: timestamp("next_payment_at").notNull(),
		memo: text("memo"),
		isPrivate: boolean("is_private").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("subscription_userId_idx").on(table.userId)],
);

export const subscriptionLabel = pgTable(
	"subscription_label",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		color: text("color").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("subscription_label_userId_idx").on(table.userId),
		uniqueIndex("subscription_label_userId_name_idx").on(
			table.userId,
			table.name,
		),
	],
);

export const subscriptionLabelAssignment = pgTable(
	"subscription_label_assignment",
	{
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		labelId: text("label_id")
			.notNull()
			.references(() => subscriptionLabel.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.subscriptionId, table.labelId] }),
		index("subscription_label_assignment_labelId_idx").on(table.labelId),
	],
);

export const financeEntry = pgTable(
	"finance_entry",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		title: text("title").notNull(),
		amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
		currency: text("currency").default("JPY").notNull(),
		occurredAt: timestamp("occurred_at").notNull(),
		paymentMethod: text("payment_method").default("other").notNull(),
		merchant: text("merchant"),
		memo: text("memo"),
		isPrivate: boolean("is_private").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("finance_entry_userId_idx").on(table.userId),
		index("finance_entry_userId_occurredAt_idx").on(
			table.userId,
			table.occurredAt,
		),
	],
);

export const financeTag = pgTable(
	"finance_tag",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		color: text("color").notNull(),
		isDefault: boolean("is_default").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("finance_tag_userId_idx").on(table.userId),
		uniqueIndex("finance_tag_userId_name_idx").on(table.userId, table.name),
	],
);

export const financeEntryTagAssignment = pgTable(
	"finance_entry_tag_assignment",
	{
		entryId: text("entry_id")
			.notNull()
			.references(() => financeEntry.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => financeTag.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.entryId, table.tagId] }),
		index("finance_entry_tag_assignment_tagId_idx").on(table.tagId),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	pushSubscriptions: many(pushSubscription),
	apiKeys: many(apiKey),
	todos: many(todo),
	scraps: many(scrap),
	subscriptions: many(subscription),
	subscriptionLabels: many(subscriptionLabel),
	financeEntries: many(financeEntry),
	financeTags: many(financeTag),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const pushSubscriptionRelations = relations(
	pushSubscription,
	({ one }) => ({
		user: one(user, {
			fields: [pushSubscription.userId],
			references: [user.id],
		}),
	}),
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id],
	}),
}));

export const todoRelations = relations(todo, ({ one }) => ({
	user: one(user, {
		fields: [todo.userId],
		references: [user.id],
	}),
}));

export const scrapRelations = relations(scrap, ({ many, one }) => ({
	user: one(user, {
		fields: [scrap.userId],
		references: [user.id],
	}),
	linkPreview: one(scrapLinkPreview),
	attachments: many(scrapAttachment),
}));

export const scrapLinkPreviewRelations = relations(
	scrapLinkPreview,
	({ one }) => ({
		scrap: one(scrap, {
			fields: [scrapLinkPreview.scrapId],
			references: [scrap.id],
		}),
		imageFile: one(files, {
			fields: [scrapLinkPreview.imageFileId],
			references: [files.id],
		}),
	}),
);

export const scrapAttachmentRelations = relations(
	scrapAttachment,
	({ one }) => ({
		scrap: one(scrap, {
			fields: [scrapAttachment.scrapId],
			references: [scrap.id],
		}),
		file: one(files, {
			fields: [scrapAttachment.fileId],
			references: [files.id],
		}),
	}),
);

export const subscriptionRelations = relations(
	subscription,
	({ many, one }) => ({
		user: one(user, {
			fields: [subscription.userId],
			references: [user.id],
		}),
		labelAssignments: many(subscriptionLabelAssignment),
	}),
);

export const subscriptionLabelRelations = relations(
	subscriptionLabel,
	({ many, one }) => ({
		user: one(user, {
			fields: [subscriptionLabel.userId],
			references: [user.id],
		}),
		assignments: many(subscriptionLabelAssignment),
	}),
);

export const subscriptionLabelAssignmentRelations = relations(
	subscriptionLabelAssignment,
	({ one }) => ({
		subscription: one(subscription, {
			fields: [subscriptionLabelAssignment.subscriptionId],
			references: [subscription.id],
		}),
		label: one(subscriptionLabel, {
			fields: [subscriptionLabelAssignment.labelId],
			references: [subscriptionLabel.id],
		}),
	}),
);

export const financeEntryRelations = relations(
	financeEntry,
	({ many, one }) => ({
		user: one(user, {
			fields: [financeEntry.userId],
			references: [user.id],
		}),
		tagAssignments: many(financeEntryTagAssignment),
	}),
);

export const financeTagRelations = relations(financeTag, ({ many, one }) => ({
	user: one(user, {
		fields: [financeTag.userId],
		references: [user.id],
	}),
	assignments: many(financeEntryTagAssignment),
}));

export const financeEntryTagAssignmentRelations = relations(
	financeEntryTagAssignment,
	({ one }) => ({
		entry: one(financeEntry, {
			fields: [financeEntryTagAssignment.entryId],
			references: [financeEntry.id],
		}),
		tag: one(financeTag, {
			fields: [financeEntryTagAssignment.tagId],
			references: [financeTag.id],
		}),
	}),
);
