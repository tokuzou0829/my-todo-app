import { uuidv7 } from "uuidv7";
import { afterEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { setup } from "@/tests/vitest.helper";

import app from "./scraps";

const { createUser, db, mock } = await setup();

describe("/routes/scraps", () => {
	afterEach(() => {
		delete process.env.IS_PUBLIC_FIRST_USER;
	});

	it("ログイン時はスクラップを検索できる", async () => {
		const user = await createUser();
		await createScrap({
			userId: user.id,
			title: "React Compiler notes",
			body: "use memo directive",
			createdAt: new Date("2026-01-03"),
		});
		await createScrap({
			userId: user.id,
			title: "Next.js routing",
			body: "app router",
			createdAt: new Date("2026-01-02"),
		});

		const response = await app.request("/?q=React");
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.scraps).toHaveLength(1);
		expect(json.scraps[0]).toMatchObject({
			title: "React Compiler notes",
		});
		expect(json.pagination.total).toBe(1);
	});

	it("未ログイン時は公開スクラップだけ検索できる", async () => {
		process.env.IS_PUBLIC_FIRST_USER = "true";
		const user = await createUser();
		await createScrap({
			userId: user.id,
			title: "公開 React メモ",
			createdAt: new Date("2026-01-03"),
		});
		await createScrap({
			userId: user.id,
			title: "非公開 React メモ",
			isPrivate: true,
			createdAt: new Date("2026-01-02"),
		});
		await createScrap({
			userId: user.id,
			title: "公開 Next.js メモ",
			createdAt: new Date("2026-01-01"),
		});

		mock.authMiddleware.mockImplementation(async (c, next) => {
			c.set("user", null);
			c.set("session", null);
			await next();
		});

		const response = await app.request("/?q=React");
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.isReadOnly).toBe(true);
		expect(json.scraps).toHaveLength(1);
		expect(json.scraps[0]).toMatchObject({
			title: "公開 React メモ",
			isPrivate: false,
		});
		expect(json.pagination.total).toBe(1);
	});

	it("未ログイン時は公開設定が無効なら公開スクラップも取得できない", async () => {
		const user = await createUser();
		const scrapId = await createScrap({
			userId: user.id,
			title: "公開 React メモ",
			createdAt: new Date("2026-01-03"),
		});

		mock.authMiddleware.mockImplementation(async (c, next) => {
			c.set("user", null);
			c.set("session", null);
			await next();
		});

		const listResponse = await app.request("/?q=React");
		const listJson = await listResponse.json();
		const detailResponse = await app.request(`/${scrapId}`);

		expect(listResponse.status).toBe(200);
		expect(listJson.owner).toBeNull();
		expect(listJson.isReadOnly).toBe(true);
		expect(listJson.scraps).toEqual([]);
		expect(listJson.pagination.total).toBe(0);
		expect(detailResponse.status).toBe(404);
	});

	it("検索文字列の%はワイルドカードとして扱う", async () => {
		const user = await createUser();
		await createScrap({
			userId: user.id,
			title: "Alpha",
			createdAt: new Date("2026-01-02"),
		});
		await createScrap({
			userId: user.id,
			title: "Beta",
			createdAt: new Date("2026-01-01"),
		});

		const response = await app.request("/?q=%");
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.scraps).toHaveLength(2);
		expect(json.pagination.total).toBe(2);
	});
});

async function createScrap({
	userId,
	title,
	body = null,
	sourceUrl = null,
	isPrivate = false,
	createdAt,
}: {
	userId: string;
	title: string;
	body?: string | null;
	sourceUrl?: string | null;
	isPrivate?: boolean;
	createdAt: Date;
}) {
	const id = uuidv7();
	await db.insert(schema.scrap).values({
		id,
		userId,
		title,
		body,
		kind: sourceUrl ? "link" : body ? "long_text" : "short_text",
		sourceUrl,
		isPrivate,
		createdAt,
		updatedAt: createdAt,
	});

	return id;
}
