import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ScrapApp } from "@/components/scrap-app";
import { auth } from "@/lib/auth";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";

export default async function ScrapsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	return <ScrapApp isReadOnly={!session} />;
}
