import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ScrapDetailModal } from "@/components/scrap-detail-modal";
import type { Scrap, ScrapKind } from "@/components/scrap-types";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";
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

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	const scrap = await getReadableScrap(scrapId, session?.user.id);

	if (!scrap) {
		notFound();
	}

	return (
		<ScrapDetailModal scrap={scrap} currentUserId={session?.user.id ?? null} />
	);
}

async function getReadableScrap(scrapId: string, currentUserId?: string) {
	const [scrap] = await db
		.select()
		.from(schema.scrap)
		.where(eq(schema.scrap.id, scrapId))
		.limit(1);

	if (!scrap || !canReadScrap(currentUserId, scrap)) {
		return null;
	}

	const [preview] = await db
		.select()
		.from(schema.scrapLinkPreview)
		.where(eq(schema.scrapLinkPreview.scrapId, scrap.id))
		.limit(1);
	const attachments = await db
		.select()
		.from(schema.scrapAttachment)
		.where(eq(schema.scrapAttachment.scrapId, scrap.id))
		.orderBy(schema.scrapAttachment.position);

	return {
		id: scrap.id,
		userId: scrap.userId,
		title: scrap.title,
		body: scrap.body,
		kind: scrap.kind as ScrapKind,
		sourceUrl: scrap.sourceUrl,
		isPrivate: scrap.isPrivate,
		createdAt: scrap.createdAt.toISOString(),
		updatedAt: scrap.updatedAt.toISOString(),
		linkPreview: preview
			? {
					id: preview.id,
					scrapId: preview.scrapId,
					url: preview.url,
					title: preview.title,
					description: preview.description,
					siteName: preview.siteName,
					providerName: preview.providerName,
					authorName: preview.authorName,
					html: preview.html,
					imageFileId: preview.imageFileId,
					imageAlt: preview.imageAlt,
					metadataSource: preview.metadataSource,
					createdAt: preview.createdAt.toISOString(),
					imageUrl: preview.imageFileId
						? `/api/scraps/files/${preview.imageFileId}`
						: null,
				}
			: null,
		attachments: attachments.map((attachment) => ({
			id: attachment.id,
			scrapId: attachment.scrapId,
			fileId: attachment.fileId,
			altText: attachment.altText,
			position: attachment.position,
			createdAt: attachment.createdAt.toISOString(),
			url: `/api/scraps/files/${attachment.fileId}`,
		})),
	} satisfies Scrap;
}

function canReadScrap(
	currentUserId: string | undefined,
	scrap: typeof schema.scrap.$inferSelect,
) {
	if (scrap.userId === currentUserId) {
		return true;
	}

	if (!currentUserId && !isPublicFirstUserEnabled()) {
		return false;
	}

	return !scrap.isPrivate;
}
