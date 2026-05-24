import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db";
import { createHonoApp } from "@/server/create-app";
import { getUserOrThrow } from "@/server/middleware/auth";
import {
	getReadableDataOwner,
	toPublicDataOwner,
} from "@/server/routes/public-data-owner";

const tagColors = ["lime", "blue", "violet", "rose", "amber", "slate"] as const;
const entryTypes = ["expense", "income"] as const;
const paymentMethods = [
	"cash",
	"credit_card",
	"bank_transfer",
	"e_money",
	"other",
] as const;
const groupByOptions = ["week", "month", "year"] as const;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DbClient = Database | Transaction;
type FinanceEntry = typeof schema.financeEntry.$inferSelect;
type FinanceTag = typeof schema.financeTag.$inferSelect;
type FinanceEntryWithTags = FinanceEntry & { tags: FinanceTag[] };

const defaultFinanceTags: Array<{ name: string; color: TagColor }> = [
	{ name: "食費", color: "lime" },
	{ name: "日用品", color: "blue" },
	{ name: "交通", color: "amber" },
	{ name: "住居", color: "slate" },
	{ name: "光熱費", color: "rose" },
	{ name: "通信", color: "violet" },
	{ name: "医療", color: "rose" },
	{ name: "教育", color: "blue" },
	{ name: "娯楽", color: "violet" },
	{ name: "給与", color: "lime" },
	{ name: "副業", color: "amber" },
	{ name: "投資", color: "slate" },
];

const tagColorSchema = z.enum(tagColors);
type TagColor = z.infer<typeof tagColorSchema>;

const entryTypeSchema = z.enum(entryTypes);
const paymentMethodSchema = z.enum(paymentMethods);
const currencySchema = z.literal("JPY");
const occurredAtSchema = z
	.string()
	.datetime()
	.transform((value) => new Date(value));
const nullableTextSchema = z
	.string()
	.trim()
	.max(240)
	.nullable()
	.transform((value) => value || null);
const newTagSchema = z.object({
	name: z.string().trim().min(1).max(40),
	color: tagColorSchema,
});

export const createFinanceEntrySchema = z.object({
	type: entryTypeSchema,
	title: z.string().trim().min(1).max(120),
	amountMinor: z.number().int().min(0).max(999_999_999_999),
	currency: currencySchema.default("JPY"),
	occurredAt: occurredAtSchema,
	paymentMethod: paymentMethodSchema.default("other"),
	merchant: nullableTextSchema.default(null),
	memo: nullableTextSchema.default(null),
	isPrivate: z.boolean().default(false),
	tagIds: z.array(z.string().uuid()).max(50).default([]),
	newTags: z.array(newTagSchema).max(20).default([]),
});

export const updateFinanceEntrySchema = createFinanceEntrySchema
	.partial()
	.refine((value) => Object.keys(value).length > 0, {
		message: "No changes provided",
	});

export const createFinanceTagSchema = newTagSchema;

export const updateFinanceTagSchema = z
	.object({
		name: z.string().trim().min(1).max(40).optional(),
		color: tagColorSchema.optional(),
	})
	.refine((value) => value.name !== undefined || value.color !== undefined, {
		message: "No changes provided",
	});

const idSchema = z.object({
	id: z.string().uuid(),
});

const analyticsQuerySchema = z.object({
	groupBy: z.enum(groupByOptions).default("month"),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	tagIds: z.string().optional(),
	type: entryTypeSchema.optional(),
});

const app = createHonoApp()
	.get("/", async (c) => {
		const { user, isReadOnly } = await getReadableDataOwner(c);

		if (!user) {
			return c.json({ entries: [], tags: [], owner: null, isReadOnly });
		}

		const result = await getFinanceEntriesWithTags(c.get("db"), user.id, {
			ensureDefaultTags: !isReadOnly,
			publicOnly: isReadOnly,
		});

		return c.json({
			...result,
			owner: toPublicDataOwner(user),
			isReadOnly,
		});
	})
	.get("/analytics", zValidator("query", analyticsQuerySchema), async (c) => {
		const { user, isReadOnly } = await getReadableDataOwner(c);

		if (!user) {
			return c.json({ points: [], summary: createAnalyticsSummary([]) });
		}

		const query = c.req.valid("query");
		const result = await getFinanceAnalytics(c.get("db"), user.id, {
			groupBy: query.groupBy,
			from: query.from ? new Date(query.from) : undefined,
			to: query.to ? new Date(query.to) : undefined,
			tagIds: parseIdList(query.tagIds),
			type: query.type,
			ensureDefaultTags: !isReadOnly,
			publicOnly: isReadOnly,
		});

		return c.json(result);
	})
	.get("/tags", async (c) => {
		const { user } = await getUserOrThrow(c);
		const tags = await ensureDefaultFinanceTags(c.get("db"), user.id);

		return c.json({ tags });
	})
	.post("/tags", zValidator("json", createFinanceTagSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const tag = await createFinanceTag(
			c.get("db"),
			user.id,
			c.req.valid("json"),
		);

		return c.json({ tag }, 201);
	})
	.patch(
		"/tags/:id",
		zValidator("param", idSchema),
		zValidator("json", updateFinanceTagSchema),
		async (c) => {
			const { user } = await getUserOrThrow(c);
			const { id } = c.req.valid("param");
			const tag = await updateFinanceTag(
				c.get("db"),
				user.id,
				id,
				c.req.valid("json"),
			);

			return c.json({ tag });
		},
	)
	.delete("/tags/:id", zValidator("param", idSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { id } = c.req.valid("param");
		const tag = await deleteFinanceTag(c.get("db"), user.id, id);

		return c.json({ tag });
	})
	.post("/entries", zValidator("json", createFinanceEntrySchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const entry = await createFinanceEntry(
			c.get("db"),
			user.id,
			c.req.valid("json"),
		);

		return c.json({ entry }, 201);
	})
	.patch(
		"/entries/:id",
		zValidator("param", idSchema),
		zValidator("json", updateFinanceEntrySchema),
		async (c) => {
			const { user } = await getUserOrThrow(c);
			const { id } = c.req.valid("param");
			const entry = await updateFinanceEntry(
				c.get("db"),
				user.id,
				id,
				c.req.valid("json"),
			);

			return c.json({ entry });
		},
	)
	.delete("/entries/:id", zValidator("param", idSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { id } = c.req.valid("param");
		const [entry] = await c
			.get("db")
			.delete(schema.financeEntry)
			.where(
				and(
					eq(schema.financeEntry.id, id),
					eq(schema.financeEntry.userId, user.id),
				),
			)
			.returning();

		if (!entry) {
			throw new HTTPException(404, { message: "Finance entry not found" });
		}

		return c.json({ entry });
	});

export async function getFinanceEntriesWithTags(
	db: DbClient,
	userId: string,
	options: {
		ensureDefaultTags?: boolean;
		publicOnly?: boolean;
		from?: Date;
		to?: Date;
		type?: FinanceEntry["type"];
		tagIds?: string[];
	} = {},
) {
	if (options.ensureDefaultTags) {
		await ensureDefaultFinanceTags(db, userId);
	}

	const filters = [eq(schema.financeEntry.userId, userId)];
	if (options.from) {
		filters.push(gte(schema.financeEntry.occurredAt, options.from));
	}
	if (options.to) {
		filters.push(lte(schema.financeEntry.occurredAt, options.to));
	}
	if (options.type) {
		filters.push(eq(schema.financeEntry.type, options.type));
	}

	const entries = await db
		.select()
		.from(schema.financeEntry)
		.where(and(...filters))
		.orderBy(
			desc(schema.financeEntry.occurredAt),
			desc(schema.financeEntry.createdAt),
		);
	const tags = await getUserFinanceTags(db, userId);
	const assignments = entries.length
		? await db
				.select({
					entryId: schema.financeEntryTagAssignment.entryId,
					tagId: schema.financeEntryTagAssignment.tagId,
				})
				.from(schema.financeEntryTagAssignment)
				.where(
					inArray(
						schema.financeEntryTagAssignment.entryId,
						entries.map((entry) => entry.id),
					),
				)
		: [];
	const tagIdsByEntryId = new Map<string, string[]>();

	for (const assignment of assignments) {
		const current = tagIdsByEntryId.get(assignment.entryId) ?? [];
		current.push(assignment.tagId);
		tagIdsByEntryId.set(assignment.entryId, current);
	}

	const tagIdFilter = new Set(options.tagIds ?? []);
	const entriesWithTags = entries
		.map((entry) => {
			const assignedTagIds = new Set(tagIdsByEntryId.get(entry.id) ?? []);
			const entryTags = tags.filter((tag) => assignedTagIds.has(tag.id));

			if (options.publicOnly && entry.isPrivate) {
				return {
					...entry,
					title: `非公開の${entry.type === "income" ? "収入" : "支出"}`,
					paymentMethod: "other",
					merchant: null,
					memo: null,
					tags: [],
				};
			}

			return {
				...entry,
				tags: entryTags,
			};
		})
		.filter(
			(entry) =>
				tagIdFilter.size === 0 ||
				entry.tags.some((tag) => tagIdFilter.has(tag.id)),
		);

	return {
		entries: entriesWithTags,
		tags,
	};
}

async function getFinanceEntryWithTags(
	db: DbClient,
	userId: string,
	entryId: string,
) {
	const result = await getFinanceEntriesWithTags(db, userId);
	const entry = result.entries.find((item) => item.id === entryId);

	if (!entry) {
		throw new HTTPException(404, { message: "Finance entry not found" });
	}

	return entry;
}

export async function getFinanceAnalytics(
	db: DbClient,
	userId: string,
	options: {
		groupBy: (typeof groupByOptions)[number];
		from?: Date;
		to?: Date;
		tagIds?: string[];
		type?: FinanceEntry["type"];
		ensureDefaultTags?: boolean;
		publicOnly?: boolean;
	},
) {
	const { entries } = await getFinanceEntriesWithTags(db, userId, options);
	const buckets = new Map<string, { income: number; expense: number }>();

	for (const entry of entries) {
		const key = getBucketKey(entry.occurredAt, options.groupBy);
		const bucket = buckets.get(key) ?? { income: 0, expense: 0 };

		if (entry.type === "income") {
			bucket.income += entry.amountMinor;
		} else {
			bucket.expense += entry.amountMinor;
		}

		buckets.set(key, bucket);
	}

	const points = Array.from(buckets.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([period, value]) => ({
			period,
			income: value.income,
			expense: value.expense,
			net: value.income - value.expense,
		}));

	return {
		points,
		summary: createAnalyticsSummary(entries),
	};
}

async function ensureDefaultFinanceTags(db: DbClient, userId: string) {
	const existingTags = await getUserFinanceTags(db, userId);
	const existingNames = new Set(existingTags.map((tag) => tag.name));
	const tagsToCreate = defaultFinanceTags.filter(
		(tag) => !existingNames.has(tag.name),
	);

	if (tagsToCreate.length) {
		await db.insert(schema.financeTag).values(
			tagsToCreate.map((tag) => ({
				id: uuidv7(),
				userId,
				name: tag.name,
				color: tag.color,
				isDefault: true,
			})),
		);
	}

	return await getUserFinanceTags(db, userId);
}

export async function createFinanceEntry(
	db: Database,
	userId: string,
	input: z.infer<typeof createFinanceEntrySchema>,
) {
	const { tagIds, newTags, ...values } = input;
	const entry = await db.transaction(async (tx) => {
		await ensureDefaultFinanceTags(tx, userId);
		const [createdEntry] = await tx
			.insert(schema.financeEntry)
			.values({
				id: uuidv7(),
				userId,
				...values,
			})
			.returning();

		if (!createdEntry) {
			throw new HTTPException(500, {
				message: "Failed to create finance entry",
			});
		}

		const resolvedTagIds = await resolveFinanceTagIds(tx, userId, {
			tagIds,
			newTags,
		});
		await replaceFinanceEntryTags(tx, createdEntry.id, resolvedTagIds);

		return createdEntry;
	});

	return await getFinanceEntryWithTags(db, userId, entry.id);
}

export async function updateFinanceEntry(
	db: Database,
	userId: string,
	entryId: string,
	input: z.infer<typeof updateFinanceEntrySchema>,
) {
	const { tagIds, newTags, ...changes } = input;

	await db.transaction(async (tx) => {
		const [existingEntry] = await tx
			.select()
			.from(schema.financeEntry)
			.where(
				and(
					eq(schema.financeEntry.id, entryId),
					eq(schema.financeEntry.userId, userId),
				),
			)
			.limit(1);

		if (!existingEntry) {
			throw new HTTPException(404, { message: "Finance entry not found" });
		}

		if (Object.keys(changes).length > 0) {
			await tx
				.update(schema.financeEntry)
				.set({
					...changes,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(schema.financeEntry.id, entryId),
						eq(schema.financeEntry.userId, userId),
					),
				);
		}

		if (tagIds !== undefined || newTags !== undefined) {
			const resolvedTagIds = await resolveFinanceTagIds(tx, userId, {
				tagIds: tagIds ?? [],
				newTags: newTags ?? [],
			});
			await replaceFinanceEntryTags(tx, entryId, resolvedTagIds);
		}
	});

	return await getFinanceEntryWithTags(db, userId, entryId);
}

export async function createFinanceTag(
	db: DbClient,
	userId: string,
	input: z.infer<typeof createFinanceTagSchema>,
) {
	await ensureDefaultFinanceTags(db, userId);
	const [tag] = await db
		.insert(schema.financeTag)
		.values({
			id: uuidv7(),
			userId,
			name: input.name,
			color: input.color,
			isDefault: false,
		})
		.returning();

	if (!tag) {
		throw new HTTPException(500, { message: "Failed to create finance tag" });
	}

	return tag;
}

export async function updateFinanceTag(
	db: DbClient,
	userId: string,
	tagId: string,
	changes: z.infer<typeof updateFinanceTagSchema>,
) {
	const [tag] = await db
		.update(schema.financeTag)
		.set({
			...changes,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.financeTag.id, tagId),
				eq(schema.financeTag.userId, userId),
			),
		)
		.returning();

	if (!tag) {
		throw new HTTPException(404, { message: "Finance tag not found" });
	}

	return tag;
}

export async function deleteFinanceTag(
	db: DbClient,
	userId: string,
	tagId: string,
) {
	const [existingTag] = await db
		.select()
		.from(schema.financeTag)
		.where(
			and(
				eq(schema.financeTag.id, tagId),
				eq(schema.financeTag.userId, userId),
			),
		)
		.limit(1);

	if (!existingTag) {
		throw new HTTPException(404, { message: "Finance tag not found" });
	}

	if (existingTag.isDefault) {
		throw new HTTPException(400, {
			message: "Default finance tags cannot be deleted",
		});
	}

	const [tag] = await db
		.delete(schema.financeTag)
		.where(
			and(
				eq(schema.financeTag.id, tagId),
				eq(schema.financeTag.userId, userId),
			),
		)
		.returning();

	return tag;
}

async function resolveFinanceTagIds(
	db: DbClient,
	userId: string,
	input: {
		tagIds: string[];
		newTags: Array<z.infer<typeof newTagSchema>>;
	},
) {
	await ensureDefaultFinanceTags(db, userId);
	const existingTagIds = Array.from(new Set(input.tagIds));
	const selectedTags = existingTagIds.length
		? await db
				.select()
				.from(schema.financeTag)
				.where(
					and(
						eq(schema.financeTag.userId, userId),
						inArray(schema.financeTag.id, existingTagIds),
					),
				)
		: [];

	if (selectedTags.length !== existingTagIds.length) {
		throw new HTTPException(400, { message: "Invalid finance tag" });
	}

	const newTagsByName = new Map(input.newTags.map((tag) => [tag.name, tag]));
	const newTagNames = Array.from(newTagsByName.keys());
	const reusableTags = newTagNames.length
		? await db
				.select()
				.from(schema.financeTag)
				.where(
					and(
						eq(schema.financeTag.userId, userId),
						inArray(schema.financeTag.name, newTagNames),
					),
				)
		: [];
	const reusableTagNames = new Set(reusableTags.map((tag) => tag.name));
	const tagsToCreate = newTagNames
		.filter((name) => !reusableTagNames.has(name))
		.map((name) => newTagsByName.get(name))
		.filter((tag) => tag !== undefined);
	const createdTags = tagsToCreate.length
		? await db
				.insert(schema.financeTag)
				.values(
					tagsToCreate.map((tag) => ({
						id: uuidv7(),
						userId,
						name: tag.name,
						color: tag.color,
						isDefault: false,
					})),
				)
				.returning()
		: [];

	return Array.from(
		new Set([
			...selectedTags.map((tag) => tag.id),
			...reusableTags.map((tag) => tag.id),
			...createdTags.map((tag) => tag.id),
		]),
	);
}

async function replaceFinanceEntryTags(
	db: DbClient,
	entryId: string,
	tagIds: string[],
) {
	await db
		.delete(schema.financeEntryTagAssignment)
		.where(eq(schema.financeEntryTagAssignment.entryId, entryId));

	if (tagIds.length === 0) {
		return;
	}

	await db.insert(schema.financeEntryTagAssignment).values(
		tagIds.map((tagId) => ({
			entryId,
			tagId,
		})),
	);
}

async function getUserFinanceTags(db: DbClient, userId: string) {
	return await db
		.select()
		.from(schema.financeTag)
		.where(eq(schema.financeTag.userId, userId))
		.orderBy(desc(schema.financeTag.isDefault), asc(schema.financeTag.name));
}

function parseIdList(value: string | undefined) {
	return value
		?.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function getBucketKey(
	value: string | Date,
	groupBy: (typeof groupByOptions)[number],
) {
	const date = new Date(value);
	if (groupBy === "year") {
		return String(date.getFullYear());
	}

	if (groupBy === "month") {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
	}

	const weekStart = new Date(date);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());
	return weekStart.toISOString().slice(0, 10);
}

function createAnalyticsSummary(entries: FinanceEntryWithTags[]) {
	const income = entries.reduce(
		(total, entry) => total + (entry.type === "income" ? entry.amountMinor : 0),
		0,
	);
	const expense = entries.reduce(
		(total, entry) =>
			total + (entry.type === "expense" ? entry.amountMinor : 0),
		0,
	);

	return {
		income,
		expense,
		net: income - expense,
	};
}

export default app;
