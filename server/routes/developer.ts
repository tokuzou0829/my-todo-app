import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import { createHonoApp } from "@/server/create-app";
import {
	apiKeyAuthMiddleware,
	getApiKeyUserOrThrow,
} from "@/server/middleware/api-key-auth";
import {
	createSubscriptionSchema,
	getSubscriptionsWithLabels,
	getSubscriptionWithLabels,
	replaceSubscriptionLabels,
	resolveLabelIds,
	updateSubscriptionSchema,
} from "@/server/routes/subscriptions";

const todoPrioritySchema = z.enum(["none", "low", "medium", "high"]);

const todoDueAtSchema = z
	.string()
	.datetime()
	.nullable()
	.optional()
	.transform((value) => {
		if (value === undefined) {
			return undefined;
		}

		return value ? new Date(value) : null;
	});

const createTodoSchema = z.object({
	title: z.string().trim().min(1).max(120),
	priority: todoPrioritySchema.default("none"),
	dueAt: todoDueAtSchema,
	isPrivate: z.boolean().default(false),
	completed: z.boolean().default(false),
});

const updateTodoSchema = z
	.object({
		title: z.string().trim().min(1).max(120).optional(),
		priority: todoPrioritySchema.optional(),
		dueAt: todoDueAtSchema,
		isPrivate: z.boolean().optional(),
		completed: z.boolean().optional(),
	})
	.refine(
		(value) =>
			value.title !== undefined ||
			value.priority !== undefined ||
			value.dueAt !== undefined ||
			value.isPrivate !== undefined ||
			value.completed !== undefined,
		{ message: "No changes provided" },
	);

const idSchema = z.object({
	id: z.string().uuid(),
});

const app = createHonoApp()
	.use("*", apiKeyAuthMiddleware)
	.get("/v1/me", (c) => {
		const { user } = getApiKeyUserOrThrow(c);

		return c.json({ user });
	})
	.get("/v1/todos", async (c) => {
		const { user } = getApiKeyUserOrThrow(c);
		const todos = await c
			.get("db")
			.select()
			.from(schema.todo)
			.where(eq(schema.todo.userId, user.id))
			.orderBy(
				sql`case ${schema.todo.priority} when 'high' then 0 when 'medium' then 1 when 'low' then 2 else 3 end`,
				asc(schema.todo.dueAt),
				desc(schema.todo.createdAt),
			);

		return c.json({ todos });
	})
	.post("/v1/todos", zValidator("json", createTodoSchema), async (c) => {
		const { user } = getApiKeyUserOrThrow(c);
		const values = c.req.valid("json");
		const [todo] = await c
			.get("db")
			.insert(schema.todo)
			.values({
				id: uuidv7(),
				userId: user.id,
				...values,
			})
			.returning();

		if (!todo) {
			throw new HTTPException(500, { message: "Failed to create todo" });
		}

		return c.json({ todo }, 201);
	})
	.patch(
		"/v1/todos/:id",
		zValidator("param", idSchema),
		zValidator("json", updateTodoSchema),
		async (c) => {
			const { user } = getApiKeyUserOrThrow(c);
			const { id } = c.req.valid("param");
			const changes = c.req.valid("json");
			const [todo] = await c
				.get("db")
				.update(schema.todo)
				.set({
					...changes,
					updatedAt: new Date(),
				})
				.where(and(eq(schema.todo.id, id), eq(schema.todo.userId, user.id)))
				.returning();

			if (!todo) {
				throw new HTTPException(404, { message: "Todo not found" });
			}

			return c.json({ todo });
		},
	)
	.delete("/v1/todos/:id", zValidator("param", idSchema), async (c) => {
		const { user } = getApiKeyUserOrThrow(c);
		const { id } = c.req.valid("param");
		const [todo] = await c
			.get("db")
			.delete(schema.todo)
			.where(and(eq(schema.todo.id, id), eq(schema.todo.userId, user.id)))
			.returning();

		if (!todo) {
			throw new HTTPException(404, { message: "Todo not found" });
		}

		return c.json({ todo });
	})
	.get("/v1/subscriptions", async (c) => {
		const { user } = getApiKeyUserOrThrow(c);
		const result = await getSubscriptionsWithLabels(c.get("db"), user.id);

		return c.json(result);
	})
	.post(
		"/v1/subscriptions",
		zValidator("json", createSubscriptionSchema),
		async (c) => {
			const { user } = getApiKeyUserOrThrow(c);
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
		},
	)
	.patch(
		"/v1/subscriptions/:id",
		zValidator("param", idSchema),
		zValidator("json", updateSubscriptionSchema),
		async (c) => {
			const { user } = getApiKeyUserOrThrow(c);
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
	.delete("/v1/subscriptions/:id", zValidator("param", idSchema), async (c) => {
		const { user } = getApiKeyUserOrThrow(c);
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

export default app;
