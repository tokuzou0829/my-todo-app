import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ScrapDetailPage } from "@/components/scrap-detail-page";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { isUuid } from "@/lib/uuid";

type ScrapPageProps = {
	params: Promise<{ id: string }>;
};

export async function generateMetadata({
	params,
}: ScrapPageProps): Promise<Metadata> {
	const siteSettings = getSiteSettings();
	const { id } = await params;

	if (!isUuid(id) || !isPublicFirstUserEnabled()) {
		return {};
	}

	const publicScrap = await getPublicScrapMetadata(id);
	if (!publicScrap) {
		return {};
	}

	const { scrap, preview } = publicScrap;
	const description = getMetadataDescription({
		body: scrap.body,
		previewDescription: preview?.description ?? null,
		fallback: siteSettings.description,
	});
	const url = `/scraps/${scrap.id}`;
	const imageUrl = `${url}/opengraph-image`;

	return {
		title: scrap.title,
		description,
		alternates: {
			canonical: url,
		},
		openGraph: {
			type: "article",
			title: scrap.title,
			description,
			url,
			siteName: siteSettings.name,
			publishedTime: scrap.createdAt.toISOString(),
			modifiedTime: scrap.updatedAt.toISOString(),
			images: [
				{
					url: imageUrl,
					width: 1200,
					height: 630,
					alt: scrap.title,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: scrap.title,
			description,
			images: [imageUrl],
		},
	};
}

export default async function ScrapPage({ params }: ScrapPageProps) {
	const { id } = await params;
	if (!isUuid(id)) {
		notFound();
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session && !isPublicFirstUserEnabled()) {
		redirect("/login");
	}

	return (
		<ScrapDetailPage scrapId={id} currentUserId={session?.user.id ?? null} />
	);
}

async function getPublicScrapMetadata(id: string) {
	const [scrap] = await db
		.select()
		.from(schema.scrap)
		.where(eq(schema.scrap.id, id))
		.limit(1);

	if (!scrap || scrap.isPrivate) {
		return null;
	}

	const previewResults = await db
		.select()
		.from(schema.scrapLinkPreview)
		.where(eq(schema.scrapLinkPreview.scrapId, scrap.id))
		.limit(1);

	return {
		scrap,
		preview: previewResults[0] ?? null,
	};
}

function getMetadataDescription({
	body,
	previewDescription,
	fallback,
}: {
	body: string | null;
	previewDescription: string | null;
	fallback: string;
}) {
	return (
		truncateMetadataText(body) ??
		truncateMetadataText(previewDescription) ??
		fallback
	);
}

function truncateMetadataText(value: string | null, maxLength = 160) {
	const normalized = value?.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return null;
	}

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 3)}...`;
}
