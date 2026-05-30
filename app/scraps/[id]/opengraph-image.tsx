import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const alt = "Scrap preview";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

type ImageProps = {
	params: Promise<{ id: string }>;
};

const supportedImageContentTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

export default async function Image({ params }: ImageProps) {
	const siteSettings = getSiteSettings();
	const { id } = await params;
	const publicScrap =
		isUuid(id) && isPublicFirstUserEnabled()
			? await getPublicScrapForImage(id)
			: null;

	if (!publicScrap) {
		return createImageResponse({
			title: "",
			description: null,
			siteName: null,
		});
	}

	const { scrap, preview, image } = publicScrap;
	const sourceLabel = scrap.sourceUrl
		? formatHost(scrap.sourceUrl)
		: (preview?.providerName ?? preview?.siteName ?? undefined);

	return createImageResponse({
		title: scrap.title,
		description:
			truncateText(scrap.body, 150) ??
			truncateText(preview?.description ?? null, 150),
		siteName: siteSettings.name,
		headerIconUrl: resolveAppUrl(siteSettings.headerIcon),
		sourceLabel,
		imageUrl: image?.url,
	});
}

async function getPublicScrapForImage(id: string) {
	const [scrap] = await db
		.select()
		.from(schema.scrap)
		.where(eq(schema.scrap.id, id))
		.limit(1);

	if (!scrap || scrap.isPrivate) {
		return null;
	}

	const [previewResults, attachmentResults] = await Promise.all([
		db
			.select()
			.from(schema.scrapLinkPreview)
			.where(eq(schema.scrapLinkPreview.scrapId, scrap.id))
			.limit(1),
		db
			.select({
				fileId: schema.scrapAttachment.fileId,
				contentType: schema.files.contentType,
			})
			.from(schema.scrapAttachment)
			.innerJoin(
				schema.files,
				eq(schema.scrapAttachment.fileId, schema.files.id),
			)
			.where(eq(schema.scrapAttachment.scrapId, scrap.id))
			.orderBy(schema.scrapAttachment.position)
			.limit(1),
	]);
	const preview = previewResults[0] ?? null;
	const previewImage = preview?.imageFileId
		? await getSupportedImage(preview.imageFileId)
		: null;
	const attachment = attachmentResults[0] ?? null;
	const attachmentImage = attachment
		? getImageDescriptor(attachment.fileId, attachment.contentType)
		: null;

	return {
		scrap,
		preview,
		image: previewImage ?? attachmentImage,
	};
}

async function getSupportedImage(fileId: string) {
	const [file] = await db
		.select({ id: schema.files.id, contentType: schema.files.contentType })
		.from(schema.files)
		.where(eq(schema.files.id, fileId))
		.limit(1);

	return file ? getImageDescriptor(file.id, file.contentType) : null;
}

function getImageDescriptor(fileId: string, contentType: string) {
	if (!supportedImageContentTypes.has(contentType)) {
		return null;
	}

	return {
		url: new URL(
			`/api/scraps/files/${fileId}`,
			process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
		).href,
	};
}

function createImageResponse({
	title,
	description,
	siteName,
	headerIconUrl,
	sourceLabel,
	imageUrl,
}: {
	title: string;
	description: string | null;
	siteName: string | null;
	headerIconUrl?: string;
	sourceLabel?: string;
	imageUrl?: string;
}) {
	const hasHeader = Boolean(siteName || headerIconUrl);
	const hasText = Boolean(title || description);
	const hasSourceLabel = Boolean(sourceLabel);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				position: "relative",
				overflow: "hidden",
				background: "#ffffff",
				color: "#172033",
				fontFamily: "sans-serif",
			}}
		>
			{imageUrl ? (
				// biome-ignore lint/performance/noImgElement: ImageResponse composes remote images with a plain img element.
				<img
					src={imageUrl}
					alt=""
					style={{
						position: "absolute",
						right: 0,
						top: 0,
						width: 470,
						height: "100%",
						objectFit: "cover",
						opacity: 0.86,
					}}
				/>
			) : null}
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
					padding: "64px 72px 56px",
					paddingRight: imageUrl ? 520 : 72,
				}}
			>
				{hasHeader ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 16,
							color: "#5f6b7a",
							fontSize: 27,
							fontWeight: 700,
						}}
					>
						{headerIconUrl ? (
							<div
								style={{
									display: "flex",
									width: 44,
									height: 44,
									overflow: "hidden",
									borderRadius: 12,
								}}
							>
								{/* biome-ignore lint/performance/noImgElement: ImageResponse composes remote images with a plain img element. */}
								<img
									src={headerIconUrl}
									alt=""
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
									}}
								/>
							</div>
						) : null}
						{siteName ? <span>{siteName}</span> : null}
					</div>
				) : null}

				{hasText ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 28,
							marginTop: hasHeader ? 88 : 120,
						}}
					>
						{title ? (
							<div
								style={{
									display: "flex",
									maxHeight: 262,
									overflow: "hidden",
									color: "#101827",
									fontSize: title.length > 42 ? 54 : 66,
									fontWeight: 800,
									letterSpacing: "-0.04em",
									lineHeight: 1.12,
								}}
							>
								{title}
							</div>
						) : null}
						{description ? (
							<div
								style={{
									display: "flex",
									maxHeight: 104,
									overflow: "hidden",
									color: "#4b5563",
									fontSize: 30,
									lineHeight: 1.48,
								}}
							>
								{description}
							</div>
						) : null}
					</div>
				) : null}

				{hasSourceLabel ? (
					<div
						style={{
							display: "flex",
							marginTop: 46,
							color: "#697386",
							fontSize: 24,
						}}
					>
						{sourceLabel}
					</div>
				) : null}
			</div>
		</div>,
		{
			...size,
		},
	);
}

function resolveAppUrl(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	try {
		return new URL(
			value,
			process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
		).href;
	} catch {
		return undefined;
	}
}

function truncateText(value: string | null, maxLength: number) {
	const normalized = value?.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return null;
	}

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 3)}...`;
}

function formatHost(value: string) {
	try {
		return new URL(value).hostname.replace(/^www\./, "");
	} catch {
		return value;
	}
}
