import { describe, expect, it } from "vitest";

import { createR2ObjectUrl } from ".";

describe("createR2ObjectUrl", () => {
	it("path style のR2 API URLにbucketとkeyを付与する", () => {
		expect(
			createR2ObjectUrl(
				"https://account.r2.cloudflarestorage.com",
				"my-todo-app",
				"users/user_1/file.jpg",
			),
		).toBe(
			"https://account.r2.cloudflarestorage.com/my-todo-app/users/user_1/file.jpg",
		);
	});

	it("base URLにbucketが含まれている場合はbucketを重複させない", () => {
		expect(
			createR2ObjectUrl(
				"https://account.r2.cloudflarestorage.com/my-todo-app",
				"my-todo-app",
				"users/user_1/file.jpg",
			),
		).toBe(
			"https://account.r2.cloudflarestorage.com/my-todo-app/users/user_1/file.jpg",
		);
	});

	it("virtual-hosted style のR2 API URLではkeyだけを付与する", () => {
		expect(
			createR2ObjectUrl(
				"https://my-todo-app.account.r2.cloudflarestorage.com",
				"my-todo-app",
				"users/user_1/file.jpg",
			),
		).toBe(
			"https://my-todo-app.account.r2.cloudflarestorage.com/users/user_1/file.jpg",
		);
	});
});
