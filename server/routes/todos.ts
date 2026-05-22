import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import { createHonoApp } from "@/server/create-app";
import { getUserOrThrow } from "@/server/middleware/auth";

const createTodoSchema = z.object({
	title: z.string().trim().min(1).max(120),
});

const todoPrioritySchema = z.enum(["none", "low", "medium", "high"]);

const todoDueAtSchema = z
	.string()
	.datetime()
	.nullable()
	.transform((value) => (value ? new Date(value) : null));

const updateTodoSchema = z
	.object({
		title: z.string().trim().min(1).max(120).optional(),
		completed: z.boolean().optional(),
		priority: todoPrioritySchema.optional(),
		dueAt: todoDueAtSchema.optional(),
	})
	.refine(
		(value) =>
			value.title !== undefined ||
			value.completed !== undefined ||
			value.priority !== undefined ||
			value.dueAt !== undefined,
		{
			message: "No changes provided",
		},
	);

const todoIdSchema = z.object({
	id: z.string().uuid(),
});

const app = createHonoApp()
	.get("/", async (c) => {
		const { user } = await getUserOrThrow(c);
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
	.post("/", zValidator("json", createTodoSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { title } = c.req.valid("json");
		const [todo] = await c
			.get("db")
			.insert(schema.todo)
			.values({
				id: uuidv7(),
				userId: user.id,
				title,
			})
			.returning();

		if (!todo) {
			throw new HTTPException(500, { message: "Failed to create todo" });
		}

		return c.json({ todo }, 201);
	})
	.patch(
		"/:id",
		zValidator("param", todoIdSchema),
		zValidator("json", updateTodoSchema),
		async (c) => {
			const { user } = await getUserOrThrow(c);
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
	.delete("/:id", zValidator("param", todoIdSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
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
	});

export default app;
