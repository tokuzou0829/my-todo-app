import { headers } from "next/headers";

import { ScrapApp } from "@/components/scrap-app";
import { auth } from "@/lib/auth";

export default async function ScrapsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return <ScrapApp isReadOnly={!session} />;
}
