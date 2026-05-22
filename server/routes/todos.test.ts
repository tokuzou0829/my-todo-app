import { describe, expect, it } from "vitest";

import { setup } from "@/tests/vitest.helper";

import app from "./todos";

const { createUser, mock } = await setup();

describe("/routes/todos", () => {
	it("未ログイン時は最初のユーザーの公開Todoだけ取得できる", async () => {
		await createUser();
		const publicCreateResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: "公開タスク",
			}),
		});
		const privateCreateResponse = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: "非公開タスク",
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
		expect(json.todos).toHaveLength(1);
		expect(json.todos[0]).toMatchObject({
			title: "公開タスク",
			isPrivate: false,
		});
	});

	it("未ログイン時も書き込みはできない", async () => {
		mock.authMiddleware.mockImplementation(async (c, next) => {
			c.set("user", null);
			c.set("session", null);
			await next();
		});

		const response = await app.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "作成できない" }),
		});
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toMatchObject({ error: "Unauthorized" });
	});
});
