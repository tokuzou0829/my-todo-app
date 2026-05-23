import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import { generateApiKey } from "@/server/api-keys";
import { createHonoApp } from "@/server/create-app";
import { getUserOrThrow } from "@/server/middleware/auth";

const createApiKeySchema = z.object({
	name: z.string().trim().min(1).max(80).default("Default API key"),
});

const apiKeyIdSchema = z.object({
	id: z.string().uuid(),
});

const app = createHonoApp()
	.get("/", async (c) => {
		const { user } = await getUserOrThrow(c);
		const apiKeys = await c
			.get("db")
			.select({
				id: schema.apiKey.id,
				name: schema.apiKey.name,
				keyPrefix: schema.apiKey.keyPrefix,
				createdAt: schema.apiKey.createdAt,
				lastUsedAt: schema.apiKey.lastUsedAt,
				revokedAt: schema.apiKey.revokedAt,
			})
			.from(schema.apiKey)
			.where(eq(schema.apiKey.userId, user.id))
			.orderBy(desc(schema.apiKey.createdAt));

		return c.json({ apiKeys });
	})
	.post("/", zValidator("json", createApiKeySchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { name } = c.req.valid("json");
		const generated = generateApiKey();
		const [apiKey] = await c
			.get("db")
			.insert(schema.apiKey)
			.values({
				id: uuidv7(),
				userId: user.id,
				name,
				keyHash: generated.keyHash,
				keyPrefix: generated.keyPrefix,
			})
			.returning({
				id: schema.apiKey.id,
				name: schema.apiKey.name,
				keyPrefix: schema.apiKey.keyPrefix,
				createdAt: schema.apiKey.createdAt,
				lastUsedAt: schema.apiKey.lastUsedAt,
				revokedAt: schema.apiKey.revokedAt,
			});

		if (!apiKey) {
			throw new HTTPException(500, { message: "Failed to create API key" });
		}

		return c.json({ apiKey, key: generated.key }, 201);
	})
	.delete("/:id", zValidator("param", apiKeyIdSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const { id } = c.req.valid("param");
		const [apiKey] = await c
			.get("db")
			.update(schema.apiKey)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(schema.apiKey.id, id),
					eq(schema.apiKey.userId, user.id),
					isNull(schema.apiKey.revokedAt),
				),
			)
			.returning({ id: schema.apiKey.id });

		if (!apiKey) {
			throw new HTTPException(404, { message: "API key not found" });
		}

		return c.json({ apiKey });
	});

export default app;
