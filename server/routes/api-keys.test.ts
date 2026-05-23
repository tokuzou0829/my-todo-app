import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { setup } from "@/tests/vitest.helper";
import app from "./api-keys";
import developerApp from "./developer";

const { createUser, db, mock } = await setup();

describe("/routes/api-keys", () => {
	it("ログインユーザーがAPIキーを発行して一覧表示できる", async () => {
		await createUser();

		const createResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Local tool" }),
		});
		const createJson = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createJson.key).toMatch(/^tdo_live_/);
		expect(createJson.apiKey).toMatchObject({
			name: "Local tool",
			revokedAt: null,
		});
		expect(createJson.apiKey.keyHash).toBeUndefined();

		const listResponse = await app.request("/", { method: "GET" });
		const listJson = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listJson.apiKeys).toHaveLength(1);
		expect(listJson.apiKeys[0]).toMatchObject({ name: "Local tool" });
		expect(listJson.apiKeys[0].keyHash).toBeUndefined();
		expect(JSON.stringify(listJson)).not.toContain(createJson.key);
	});

	it("未ログインではAPIキーを発行できない", async () => {
		mock.authMiddleware.mockImplementation(async (c, next) => {
			c.set("user", null);
			c.set("session", null);
			await next();
		});

		const response = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Blocked" }),
		});
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toMatchObject({ error: "Unauthorized" });
	});

	it("失効したAPIキーは開発者APIに使えない", async () => {
		await createUser();
		const createResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Revoke me" }),
		});
		const createJson = await createResponse.json();
		const key = createJson.key as string;
		const apiKeyId = createJson.apiKey.id as string;

		const revokeResponse = await app.request(`/${apiKeyId}`, {
			method: "DELETE",
		});

		expect(revokeResponse.status).toBe(200);

		const developerResponse = await developerApp.request("/v1/me", {
			headers: { Authorization: `Bearer ${key}` },
		});
		const developerJson = await developerResponse.json();

		expect(developerResponse.status).toBe(401);
		expect(developerJson).toMatchObject({ error: "Invalid API key" });
		const [storedApiKey] = await db.select().from(schema.apiKey);
		expect(storedApiKey?.revokedAt).toBeInstanceOf(Date);
	});
});
