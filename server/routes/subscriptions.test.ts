import { describe, expect, it } from "vitest";
import { setup } from "@/tests/vitest.helper";
import app from "./subscriptions";

const { createUser, mock } = await setup();

describe("/routes/subscriptions", () => {
	it("未ログイン時は最初のユーザーの公開用データを取得できる", async () => {
		await createUser();
		const publicCreateResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Public Storage",
				amountMinor: 500,
				currency: "JPY",
				billingIntervalUnit: "month",
				billingIntervalCount: 1,
				nextPaymentAt: "2026-02-01T00:00:00.000Z",
				memo: "visible memo",
			}),
		});
		const privateCreateResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Private Storage",
				amountMinor: 1500,
				currency: "JPY",
				billingIntervalUnit: "month",
				billingIntervalCount: 1,
				nextPaymentAt: "2026-02-02T00:00:00.000Z",
				memo: "private memo",
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

		const response = await app.request("/", {
			method: "GET",
		});
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.owner).toMatchObject({ name: "Test User" });
		expect(json.isReadOnly).toBe(true);
		expect(json.subscriptions).toHaveLength(2);
		expect(json.subscriptions[0]).toMatchObject({
			name: "Public Storage",
			memo: "visible memo",
			isPrivate: false,
		});
		expect(json.subscriptions[1]).toMatchObject({
			name: "非公開のサブスクリプション",
			memo: null,
			amountMinor: 1500,
			isPrivate: true,
		});
	});

	it("ログイン時はサブスクリプションを管理できる", async () => {
		await createUser();

		const createResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Music Plus",
				amountMinor: 980,
				currency: "JPY",
				billingIntervalUnit: "month",
				billingIntervalCount: 1,
				nextPaymentAt: "2026-02-01T00:00:00.000Z",
				memo: "family plan",
				newLabels: [
					{ name: "娯楽", color: "violet" },
					{ name: "家族", color: "lime" },
				],
			}),
		});
		const createJson = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createJson.subscription).toMatchObject({
			name: "Music Plus",
			amountMinor: 980,
			currency: "JPY",
			billingIntervalUnit: "month",
			billingIntervalCount: 1,
			nextPaymentAt: "2026-02-01T00:00:00.000Z",
			memo: "family plan",
		});
		expect(createJson.subscription.labels).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "娯楽", color: "violet" }),
				expect.objectContaining({ name: "家族", color: "lime" }),
			]),
		);

		const subscriptionId = createJson.subscription.id as string;
		const familyLabelId = (
			createJson.subscription.labels as Array<{ id: string; name: string }>
		).find((label) => label.name === "家族")?.id;
		expect(familyLabelId).toBeDefined();
		if (!familyLabelId) {
			throw new Error("Family label was not created");
		}
		const updateResponse = await app.request(`/${subscriptionId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				amountMinor: 1200,
				nextPaymentAt: "2026-03-01T00:00:00.000Z",
				labelIds: [familyLabelId],
				newLabels: [{ name: "仕事", color: "blue" }],
			}),
		});
		const updateJson = await updateResponse.json();

		expect(updateResponse.status).toBe(200);
		expect(updateJson.subscription).toMatchObject({
			id: subscriptionId,
			amountMinor: 1200,
			nextPaymentAt: "2026-03-01T00:00:00.000Z",
		});
		expect(updateJson.subscription.labels).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "家族", color: "lime" }),
				expect.objectContaining({ name: "仕事", color: "blue" }),
			]),
		);

		const listResponse = await app.request("/", {
			method: "GET",
		});
		const listJson = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listJson.labels).toHaveLength(3);
		expect(listJson.subscriptions).toHaveLength(1);
		expect(listJson.subscriptions[0]).toMatchObject({
			id: subscriptionId,
			name: "Music Plus",
			amountMinor: 1200,
		});
		expect(listJson.subscriptions[0].labels).toHaveLength(2);

		const deleteResponse = await app.request(`/${subscriptionId}`, {
			method: "DELETE",
		});

		expect(deleteResponse.status).toBe(200);
	});

	it("30日ごとの支払い周期を登録できる", async () => {
		await createUser();

		const response = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Fixed Cycle",
				amountMinor: 1000,
				currency: "JPY",
				billingIntervalUnit: "day",
				billingIntervalCount: 30,
				nextPaymentAt: "2026-01-01T00:00:00.000Z",
			}),
		});
		const json = await response.json();

		expect(response.status).toBe(201);
		expect(json.subscription).toMatchObject({
			name: "Fixed Cycle",
			billingIntervalUnit: "day",
			billingIntervalCount: 30,
		});
	});
});
