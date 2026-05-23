import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiKeyManager } from "@/components/api-key-manager";
import { auth } from "@/lib/auth";

export default async function ApiKeysPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	return <ApiKeyManager />;
}
