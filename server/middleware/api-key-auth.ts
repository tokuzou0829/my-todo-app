import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import * as schema from "@/db/schema";
import { getApiKeyFromHeaders, hashApiKey } from "@/server/api-keys";
import type { Context } from "@/server/types";

export const apiKeyAuthMiddleware = createMiddleware(async (c, next) => {
	const key = getApiKeyFromHeaders(c.req.raw.headers);

	if (!key) {
		throw new HTTPException(401, { message: "API key is required" });
	}

	const [result] = await c
		.get("db")
		.select({
			apiKey: schema.apiKey,
			user: schema.user,
		})
		.from(schema.apiKey)
		.innerJoin(schema.user, eq(schema.apiKey.userId, schema.user.id))
		.where(
			and(
				eq(schema.apiKey.keyHash, hashApiKey(key)),
				isNull(schema.apiKey.revokedAt),
			),
		)
		.limit(1);

	if (!result) {
		throw new HTTPException(401, { message: "Invalid API key" });
	}

	await c
		.get("db")
		.update(schema.apiKey)
		.set({ lastUsedAt: new Date() })
		.where(eq(schema.apiKey.id, result.apiKey.id));

	c.set("apiKeyUser", result.user);
	c.set("apiKeyId", result.apiKey.id);
	await next();
});

export const getApiKeyUserOrThrow = (c: Context) => {
	const user = c.get("apiKeyUser");
	const apiKeyId = c.get("apiKeyId");

	if (!user || !apiKeyId) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	return { user, apiKeyId };
};
