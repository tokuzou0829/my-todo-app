import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TodoApp } from "@/components/todo-app";
import { auth } from "@/lib/auth";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";

export default async function Home() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	return <TodoApp isReadOnly={!session} />;
}
