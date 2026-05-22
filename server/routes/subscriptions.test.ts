import { describe, expect, it } from "vitest";
import { setup } from "@/tests/vitest.helper";
import app from "./subscriptions";

const { createUser } = await setup();

describe("/routes/subscriptions", () => {
	it("未ログイン時はAPIに到達できない", async () => {
		const response = await app.request("/", {
			method: "GET",
		});
		const json = await response.json();

		expect(json).toMatchInlineSnapshot(`
			{
			  "error": "Unauthorized",
			}
		`);
		expect(response.status).toBe(401);
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
});
