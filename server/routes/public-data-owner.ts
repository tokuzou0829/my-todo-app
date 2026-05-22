import { asc } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { auth } from "@/lib/auth";
import type { Context } from "@/server/types";

type User = typeof auth.$Infer.Session.user;

export type PublicDataOwner = Pick<User, "id" | "name">;

export async function getReadableDataOwner(c: Context) {
	const currentUser = c.get("user");

	if (currentUser) {
		return {
			user: currentUser,
			isReadOnly: false,
		} as const;
	}

	const [firstUser] = await c
		.get("db")
		.select()
		.from(schema.user)
		.orderBy(asc(schema.user.createdAt), asc(schema.user.id))
		.limit(1);

	return {
		user: firstUser ?? null,
		isReadOnly: true,
	} as const;
}

export function toPublicDataOwner(user: User): PublicDataOwner {
	return {
		id: user.id,
		name: user.name,
	};
}
