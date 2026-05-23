import { uuidv7 } from "uuidv7";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { setup } from "@/tests/vitest.helper";

import apiKeysApp from "./api-keys";
import app from "./developer";

const { createUser, db } = await setup();

describe("/routes/developer", () => {
	it("APIキーなしでは利用できない", async () => {
		const response = await app.request("/v1/me");
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toMatchObject({ error: "API key is required" });
	});

	it("不正なAPIキーでは利用できない", async () => {
		const response = await app.request("/v1/me", {
			headers: { "X-API-Key": "invalid" },
		});
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toMatchObject({ error: "Invalid API key" });
	});

	it("APIキーで本人のTodoをprivate含めてCRUDできる", async () => {
		await createUser();
		const key = await createApiKey();

		const createResponse = await app.request("/v1/todos", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: "Private API task",
				priority: "high",
				dueAt: "2026-03-01T00:00:00.000Z",
				isPrivate: true,
			}),
		});
		const createJson = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createJson.todo).toMatchObject({
			title: "Private API task",
			priority: "high",
			isPrivate: true,
			completed: false,
		});

		const todoId = createJson.todo.id as string;
		const listResponse = await app.request("/v1/todos", {
			headers: { "X-API-Key": key },
		});
		const listJson = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listJson.todos).toHaveLength(1);
		expect(listJson.todos[0]).toMatchObject({
			id: todoId,
			isPrivate: true,
		});

		const updateResponse = await app.request(`/v1/todos/${todoId}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ completed: true, dueAt: null }),
		});
		const updateJson = await updateResponse.json();

		expect(updateResponse.status).toBe(200);
		expect(updateJson.todo).toMatchObject({
			completed: true,
			dueAt: null,
		});

		const deleteResponse = await app.request(`/v1/todos/${todoId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${key}` },
		});

		expect(deleteResponse.status).toBe(200);
	});

	it("APIキーで本人のサブスクリプションをprivate含めてCRUDできる", async () => {
		await createUser();
		const key = await createApiKey();

		const createResponse = await app.request("/v1/subscriptions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: "Private Cloud",
				amountMinor: 1980,
				currency: "JPY",
				billingIntervalUnit: "month",
				billingIntervalCount: 1,
				nextPaymentAt: "2026-04-01T00:00:00.000Z",
				memo: "internal",
				isPrivate: true,
				newLabels: [{ name: "開発", color: "blue" }],
			}),
		});
		const createJson = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createJson.subscription).toMatchObject({
			name: "Private Cloud",
			memo: "internal",
			isPrivate: true,
		});
		expect(createJson.subscription.labels).toEqual([
			expect.objectContaining({ name: "開発", color: "blue" }),
		]);

		const subscriptionId = createJson.subscription.id as string;
		const listResponse = await app.request("/v1/subscriptions", {
			headers: { Authorization: `Bearer ${key}` },
		});
		const listJson = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listJson.subscriptions).toHaveLength(1);
		expect(listJson.subscriptions[0]).toMatchObject({
			id: subscriptionId,
			name: "Private Cloud",
			isPrivate: true,
		});

		const updateResponse = await app.request(
			`/v1/subscriptions/${subscriptionId}`,
			{
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amountMinor: 2500,
					memo: null,
					newLabels: [{ name: "更新", color: "rose" }],
				}),
			},
		);
		const updateJson = await updateResponse.json();

		expect(updateResponse.status).toBe(200);
		expect(updateJson.subscription).toMatchObject({
			amountMinor: 2500,
			memo: null,
		});
		expect(updateJson.subscription.labels).toEqual([
			expect.objectContaining({ name: "更新", color: "rose" }),
		]);

		const deleteResponse = await app.request(
			`/v1/subscriptions/${subscriptionId}`,
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${key}` },
			},
		);

		expect(deleteResponse.status).toBe(200);
	});

	it("他ユーザーのデータは操作できない", async () => {
		await createUser();
		const key = await createApiKey();
		const otherTodoId = uuidv7();

		await db.insert(schema.user).values({
			id: "other_user_id",
			name: "Other User",
			email: "other@example.com",
			emailVerified: true,
		});
		await db.insert(schema.todo).values({
			id: otherTodoId,
			userId: "other_user_id",
			title: "Other task",
		});

		const response = await app.request(`/v1/todos/${otherTodoId}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ completed: true }),
		});
		const json = await response.json();

		expect(response.status).toBe(404);
		expect(json).toMatchObject({ error: "Todo not found" });
	});
});

async function createApiKey() {
	const response = await apiKeysApp.request("/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Developer test" }),
	});
	const json = (await response.json()) as { key: string };

	if (!response.ok) {
		throw new Error("Failed to create test API key");
	}

	return json.key;
}
