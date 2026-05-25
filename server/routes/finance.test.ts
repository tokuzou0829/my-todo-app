import { afterEach, describe, expect, it } from "vitest";

import { setup } from "@/tests/vitest.helper";

import app from "./finance";

const { createUser, mock } = await setup();

describe("/routes/finance", () => {
	afterEach(() => {
		delete process.env.IS_PUBLIC_FIRST_USER;
	});

	it("未ログイン時は非公開項目の種別と金額だけを取得できる", async () => {
		process.env.IS_PUBLIC_FIRST_USER = "true";
		await createUser();
		const publicCreateResponse = await app.request("/entries", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				type: "expense",
				title: "Public lunch",
				amountMinor: 1200,
				occurredAt: "2026-04-01T00:00:00.000Z",
			}),
		});
		const privateCreateResponse = await app.request("/entries", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				type: "income",
				title: "Private salary",
				amountMinor: 300000,
				occurredAt: "2026-04-02T00:00:00.000Z",
				isPrivate: true,
			}),
		});
		expect(publicCreateResponse.status).toBe(201);
		expect(privateCreateResponse.status).toBe(201);

		mock.authMiddleware.mockImplementation(async (c, next) => {
			c.set("user", null);
			c.set("session", null);
			await next();
		});

		const response = await app.request("/", { method: "GET" });
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.owner).toMatchObject({ name: "Test User" });
		expect(json.isReadOnly).toBe(true);
		expect(json.entries).toHaveLength(2);
		expect(json.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					title: "Public lunch",
					amountMinor: 1200,
					isPrivate: false,
				}),
				expect.objectContaining({
					title: "非公開の収入",
					type: "income",
					amountMinor: 300000,
					merchant: null,
					memo: null,
					isPrivate: true,
					tags: [],
				}),
			]),
		);
	});

	it("ログイン時は家計簿項目、タグ、集計を管理できる", async () => {
		await createUser();

		const listResponse = await app.request("/", { method: "GET" });
		const listJson = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listJson.tags.length).toBeGreaterThanOrEqual(12);
		expect(listJson.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "食費", isDefault: true }),
			]),
		);

		const createResponse = await app.request("/entries", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				type: "expense",
				title: "Groceries",
				amountMinor: 3200,
				occurredAt: "2026-04-01T00:00:00.000Z",
				paymentMethod: "credit_card",
				merchant: "Local Market",
				memo: "weekly shopping",
				isPrivate: true,
				newTags: [{ name: "変動費", color: "amber" }],
			}),
		});
		const createJson = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createJson.entry).toMatchObject({
			title: "Groceries",
			type: "expense",
			amountMinor: 3200,
			isPrivate: true,
		});
		expect(createJson.entry.tags).toEqual([
			expect.objectContaining({ name: "変動費", color: "amber" }),
		]);

		const entryId = createJson.entry.id as string;
		const tagId = createJson.entry.tags[0].id as string;
		const updateResponse = await app.request(`/entries/${entryId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				type: "income",
				title: "Side project",
				amountMinor: 50000,
				occurredAt: "2026-04-03T00:00:00.000Z",
				paymentMethod: "bank_transfer",
				isPrivate: false,
				tagIds: [tagId],
			}),
		});
		const updateJson = await updateResponse.json();

		expect(updateResponse.status).toBe(200);
		expect(updateJson.entry).toMatchObject({
			title: "Side project",
			type: "income",
			amountMinor: 50000,
			isPrivate: false,
		});

		const analyticsResponse = await app.request("/analytics?groupBy=month", {
			method: "GET",
		});
		const analyticsJson = await analyticsResponse.json();

		expect(analyticsResponse.status).toBe(200);
		expect(analyticsJson.points).toEqual([
			expect.objectContaining({
				period: "2026-04",
				income: 50000,
				expense: 0,
				net: 50000,
			}),
		]);

		const tagUpdateResponse = await app.request(`/tags/${tagId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "副収入", color: "lime" }),
		});
		const tagUpdateJson = await tagUpdateResponse.json();

		expect(tagUpdateResponse.status).toBe(200);
		expect(tagUpdateJson.tag).toMatchObject({ name: "副収入", color: "lime" });

		const tagDeleteResponse = await app.request(`/tags/${tagId}`, {
			method: "DELETE",
		});

		expect(tagDeleteResponse.status).toBe(200);

		const deleteResponse = await app.request(`/entries/${entryId}`, {
			method: "DELETE",
		});

		expect(deleteResponse.status).toBe(200);
	});
});
