import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ScrapDetailPage } from "@/components/scrap-detail-page";
import { auth } from "@/lib/auth";
import { isUuid } from "@/lib/uuid";

export default async function ScrapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	if (!isUuid(id)) {
		notFound();
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return (
		<ScrapDetailPage scrapId={id} currentUserId={session?.user.id ?? null} />
	);
}
