import { headers } from "next/headers";

import { SubscriptionApp } from "@/components/subscription-app";
import { auth } from "@/lib/auth";

export default async function SubscriptionsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return <SubscriptionApp isReadOnly={!session} />;
}
