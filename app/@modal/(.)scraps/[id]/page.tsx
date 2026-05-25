import { headers } from "next/headers";

import { ScrapDetailModal } from "@/components/scrap-detail-modal";
import { auth } from "@/lib/auth";
import { extractUuid } from "@/lib/uuid";

export default async function ScrapModalPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const scrapId = extractUuid(id) ?? id;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return (
		<ScrapDetailModal
			scrapId={scrapId}
			currentUserId={session?.user.id ?? null}
		/>
	);
}
