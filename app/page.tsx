import { headers } from "next/headers";

import { TodoApp } from "@/components/todo-app";
import { auth } from "@/lib/auth";

export default async function Home() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return <TodoApp isReadOnly={!session} />;
}
