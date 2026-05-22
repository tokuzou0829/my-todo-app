import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db";
import { createHonoApp } from "@/server/create-app";
import { getUserOrThrow } from "@/server/middleware/auth";

const labelColors = [
	"lime",
	"blue",
	"violet",
	"rose",
	"amber",
	"slate",
] as const;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DbClient = Database | Transaction;

const currencySchema = z.literal("JPY");
const billingIntervalUnitSchema = z.enum(["week", "month", "year"]);
const labelColorSchema = z.enum(labelColors);
const nextPaymentAtSchema = z
	.string()
	.datetime()
	.transform((value) => new Date(value));
const memoSchema = z
	.string()
	.trim()
	.max(240)
	.nullable()
	.transform((value) => value || null);
const newLabelSchema = z.object({
	name: z.string().trim().min(1).max(40),
	color: labelColorSchema,
});

const createSubscriptionSchema = z.object({
	name: z.string().trim().min(1).max(120),
	amountMinor: z.number().int().min(0).max(999_999_999_999),
	currency: currencySchema.default("JPY"),
	billingIntervalUnit: billingIntervalUnitSchema,
	billingIntervalCount: z.number().int().min(1).max(60),
	nextPaymentAt: nextPaymentAtSchema,
	memo: memoSchema.default(null),
	labelIds: z.array(z.string().uuid()).max(50).default([]),
	newLabels: z.array(newLabelSchema).max(20).default([]),
});

const updateSubscriptionSchema = createSubscriptionSchema
	.partial()
	.refine((value) => Object.keys(value).length > 0, {
		message: "No changes provided",
	});

const subscriptionIdSchema = z.object({
	id: z.string().uuid(),
});

const app = createHonoApp()
	.get("/", async (c) => {
		const { user } = await getUserOrThrow(c);
		const db = c.get("db");
		const result = await getSubscriptionsWithLabels(db, user.id);

		return c.json(result);
	})
	.post("/", zValidator("json", createSubscriptionSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { labelIds, newLabels, ...values } = c.req.valid("json");
		const subscription = await c.get("db").transaction(async (tx) => {
			const [createdSubscription] = await tx
				.insert(schema.subscription)
				.values({
					id: uuidv7(),
					userId: user.id,
					...values,
				})
				.returning();

			if (!createdSubscription) {
				throw new HTTPException(500, {
					message: "Failed to create subscription",
				});
			}

			const resolvedLabelIds = await resolveLabelIds(tx, user.id, {
				labelIds,
				newLabels,
			});
			await replaceSubscriptionLabels(
				tx,
				createdSubscription.id,
				resolvedLabelIds,
			);

			return createdSubscription;
		});

		const result = await getSubscriptionWithLabels(
			c.get("db"),
			user.id,
			subscription.id,
		);
		return c.json({ subscription: result }, 201);
	})
	.patch(
		"/:id",
		zValidator("param", subscriptionIdSchema),
		zValidator("json", updateSubscriptionSchema),
		async (c) => {
			const { user } = await getUserOrThrow(c);
			const { id } = c.req.valid("param");
			const { labelIds, newLabels, ...changes } = c.req.valid("json");
			const db = c.get("db");

			await db.transaction(async (tx) => {
				const [existingSubscription] = await tx
					.select()
					.from(schema.subscription)
					.where(
						and(
							eq(schema.subscription.id, id),
							eq(schema.subscription.userId, user.id),
						),
					)
					.limit(1);

				if (!existingSubscription) {
					throw new HTTPException(404, { message: "Subscription not found" });
				}

				if (Object.keys(changes).length > 0) {
					await tx
						.update(schema.subscription)
						.set({
							...changes,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(schema.subscription.id, id),
								eq(schema.subscription.userId, user.id),
							),
						);
				}

				if (labelIds !== undefined || newLabels !== undefined) {
					const resolvedLabelIds = await resolveLabelIds(tx, user.id, {
						labelIds: labelIds ?? [],
						newLabels: newLabels ?? [],
					});
					await replaceSubscriptionLabels(tx, id, resolvedLabelIds);
				}
			});

			const subscription = await getSubscriptionWithLabels(db, user.id, id);
			return c.json({ subscription });
		},
	)
	.delete("/:id", zValidator("param", subscriptionIdSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { id } = c.req.valid("param");
		const [subscription] = await c
			.get("db")
			.delete(schema.subscription)
			.where(
				and(
					eq(schema.subscription.id, id),
					eq(schema.subscription.userId, user.id),
				),
			)
			.returning();

		if (!subscription) {
			throw new HTTPException(404, { message: "Subscription not found" });
		}

		return c.json({ subscription });
	});

async function getSubscriptionsWithLabels(db: DbClient, userId: string) {
	const subscriptions = await db
		.select()
		.from(schema.subscription)
		.where(eq(schema.subscription.userId, userId))
		.orderBy(
			asc(schema.subscription.nextPaymentAt),
			asc(schema.subscription.name),
		);
	const labels = await getUserLabels(db, userId);
	const assignments = subscriptions.length
		? await db
				.select({
					subscriptionId: schema.subscriptionLabelAssignment.subscriptionId,
					labelId: schema.subscriptionLabelAssignment.labelId,
				})
				.from(schema.subscriptionLabelAssignment)
				.where(
					inArray(
						schema.subscriptionLabelAssignment.subscriptionId,
						subscriptions.map((subscription) => subscription.id),
					),
				)
		: [];
	const labelIdsBySubscriptionId = new Map<string, string[]>();

	for (const assignment of assignments) {
		const current =
			labelIdsBySubscriptionId.get(assignment.subscriptionId) ?? [];
		current.push(assignment.labelId);
		labelIdsBySubscriptionId.set(assignment.subscriptionId, current);
	}

	return {
		subscriptions: subscriptions.map((subscription) => {
			const assignedLabelIds = new Set(
				labelIdsBySubscriptionId.get(subscription.id) ?? [],
			);

			return {
				...subscription,
				labels: labels.filter((label) => assignedLabelIds.has(label.id)),
			};
		}),
		labels,
	};
}

async function getSubscriptionWithLabels(
	db: DbClient,
	userId: string,
	subscriptionId: string,
) {
	const result = await getSubscriptionsWithLabels(db, userId);
	const subscription = result.subscriptions.find(
		(item) => item.id === subscriptionId,
	);

	if (!subscription) {
		throw new HTTPException(404, { message: "Subscription not found" });
	}

	return subscription;
}

async function getUserLabels(db: DbClient, userId: string) {
	return await db
		.select()
		.from(schema.subscriptionLabel)
		.where(eq(schema.subscriptionLabel.userId, userId))
		.orderBy(asc(schema.subscriptionLabel.name));
}

async function resolveLabelIds(
	db: DbClient,
	userId: string,
	input: {
		labelIds: string[];
		newLabels: Array<z.infer<typeof newLabelSchema>>;
	},
) {
	const existingLabelIds = Array.from(new Set(input.labelIds));
	const selectedLabels = existingLabelIds.length
		? await db
				.select()
				.from(schema.subscriptionLabel)
				.where(
					and(
						eq(schema.subscriptionLabel.userId, userId),
						inArray(schema.subscriptionLabel.id, existingLabelIds),
					),
				)
		: [];

	if (selectedLabels.length !== existingLabelIds.length) {
		throw new HTTPException(400, { message: "Invalid subscription label" });
	}

	const newLabelsByName = new Map(
		input.newLabels.map((label) => [label.name, label]),
	);
	const newLabelNames = Array.from(newLabelsByName.keys());
	const reusableLabels = newLabelNames.length
		? await db
				.select()
				.from(schema.subscriptionLabel)
				.where(
					and(
						eq(schema.subscriptionLabel.userId, userId),
						inArray(schema.subscriptionLabel.name, newLabelNames),
					),
				)
		: [];
	const reusableLabelNames = new Set(reusableLabels.map((label) => label.name));
	const labelsToCreate = newLabelNames
		.filter((name) => !reusableLabelNames.has(name))
		.map((name) => newLabelsByName.get(name))
		.filter((label) => label !== undefined);
	const createdLabels = labelsToCreate.length
		? await db
				.insert(schema.subscriptionLabel)
				.values(
					labelsToCreate.map((label) => ({
						id: uuidv7(),
						userId,
						name: label.name,
						color: label.color,
					})),
				)
				.returning()
		: [];

	return Array.from(
		new Set([
			...selectedLabels.map((label) => label.id),
			...reusableLabels.map((label) => label.id),
			...createdLabels.map((label) => label.id),
		]),
	);
}

async function replaceSubscriptionLabels(
	db: DbClient,
	subscriptionId: string,
	labelIds: string[],
) {
	await db
		.delete(schema.subscriptionLabelAssignment)
		.where(
			eq(schema.subscriptionLabelAssignment.subscriptionId, subscriptionId),
		);

	if (labelIds.length === 0) {
		return;
	}

	await db.insert(schema.subscriptionLabelAssignment).values(
		labelIds.map((labelId) => ({
			subscriptionId,
			labelId,
		})),
	);
}

export default app;
