import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FinanceApp } from "@/components/finance-app";
import { auth } from "@/lib/auth";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";

export default async function FinancePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	return <FinanceApp isReadOnly={!session} />;
}
