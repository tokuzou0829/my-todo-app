import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SubscriptionApp } from "@/components/subscription-app";
import { auth } from "@/lib/auth";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";

export default async function SubscriptionsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	return <SubscriptionApp isReadOnly={!session} />;
}
