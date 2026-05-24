import { headers } from "next/headers";

import { FinanceApp } from "@/components/finance-app";
import { auth } from "@/lib/auth";

export default async function FinancePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return <FinanceApp isReadOnly={!session} />;
}
