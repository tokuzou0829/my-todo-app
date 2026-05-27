import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db";
import { isPublicFirstUserEnabled } from "@/lib/public-data-settings";
import { createHonoApp } from "@/server/create-app";
import {
	createFileRepository,
	createR2ObjectUrl,
} from "@/server/infrastructure/repositories/file";
import { getUserOrThrow } from "@/server/middleware/auth";
import { createBlobFile } from "@/server/objects/file";
import {
	getReadableDataOwner,
	toPublicDataOwner,
} from "@/server/routes/public-data-owner";
import {
	extractYouTubeMetadata,
	fetchYouTubePlayerMetadata,
	normalizeYouTubeUrl,
	type YouTubeMetadata,
} from "@/server/routes/scrap-youtube-metadata";
import type { Context } from "@/server/types";

const MAX_ATTACHMENT_COUNT = 4;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 7_000;
const MAX_HTML_METADATA_BYTES = 3_000_000;
const DEFAULT_SCRAPS_PER_PAGE = 30;
const MAX_SCRAPS_PER_PAGE = 100;

const imageTypes = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/gif": ".gif",
	"image/avif": ".avif",
	"image/heic": ".heic",
	"image/heif": ".heif",
} as const;

const createScrapSchema = z.object({
	title: z.string().trim().max(500).default(""),
	body: z.string().trim().max(20_000).default(""),
	isPrivate: z.boolean().default(false),
});

const scrapIdSchema = z.object({
	id: z.string().uuid(),
});

const scrapsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce
		.number()
		.int()
		.min(1)
		.max(MAX_SCRAPS_PER_PAGE)
		.default(DEFAULT_SCRAPS_PER_PAGE),
	q: z.string().max(500).default(""),
});

type ScrapKind = "short_text" | "long_text" | "link" | "image";
type ImageType = keyof typeof imageTypes;
type ImageDescriptor = {
	file: File;
	contentType: ImageType;
	keyExtension: (typeof imageTypes)[ImageType];
};
type LinkMetadata = {
	url: string;
	title: string | null;
	description: string | null;
	siteName: string | null;
	providerName: string | null;
	authorName: string | null;
	html: string | null;
	imageUrl: string | null;
	imageAlt: string | null;
	metadataSource:
		| "oembed"
		| "open_graph"
		| "twitter_card"
		| "html"
		| "provider_api"
		| "none";
	rawMetadata: Record<string, unknown>;
};

const app = createHonoApp()
	.get("/", zValidator("query", scrapsQuerySchema), async (c) => {
		const { user, isReadOnly } = await getReadableDataOwner(c);
		const query = c.req.valid("query");
		const pagination = {
			page: query.page,
			perPage: query.perPage,
			total: 0,
			pageCount: 0,
		};

		if (!user) {
			return c.json({ scraps: [], owner: null, isReadOnly, pagination });
		}

		const scraps = await getScraps(c.get("db"), user.id, {
			publicOnly: isReadOnly,
			search: query.q,
			limit: query.perPage,
			offset: (query.page - 1) * query.perPage,
		});
		const total = await getScrapCount(c.get("db"), user.id, {
			publicOnly: isReadOnly,
			search: query.q,
		});

		return c.json({
			scraps,
			owner: toPublicDataOwner(user),
			isReadOnly,
			pagination: {
				...pagination,
				total,
				pageCount: Math.ceil(total / query.perPage),
			},
		});
	})
	.get("/files/:id", async (c) => {
		const fileId = c.req.param("id");
		const file = await getReadableScrapFile(c, fileId);

		if (!file) {
			throw new HTTPException(404, { message: "File not found" });
		}

		const { client, baseUrl } = c.get("r2");
		const response = await client.fetch(
			createR2ObjectUrl(baseUrl, file.bucket, file.key),
		);

		if (!response.ok || !response.body) {
			throw new HTTPException(404, { message: "File not found" });
		}

		return new Response(response.body, {
			status: 200,
			headers: {
				"Content-Type": file.contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	})
	.get("/:id", async (c) => {
		const { id } = getScrapIdOrThrow(c.req.param("id"));
		const db = c.get("db");
		const currentUser = c.get("user");

		const [targetScrap] = await db
			.select()
			.from(schema.scrap)
			.where(eq(schema.scrap.id, id))
			.limit(1);

		if (!targetScrap || !canReadScrap(currentUser?.id, targetScrap)) {
			throw new HTTPException(404, { message: "Scrap not found" });
		}

		const [scrap] = await getScraps(db, targetScrap.userId, {
			scrapIds: [id],
		});

		if (!scrap) {
			throw new HTTPException(404, { message: "Scrap not found" });
		}

		return c.json({ scrap });
	})
	.post("/", async (c) => {
		const { user } = await getUserOrThrow(c);
		const formData = await c.req.raw.formData();
		const parsed = createScrapSchema.safeParse({
			title: getFormString(formData, "title"),
			body: getFormString(formData, "body"),
			isPrivate: getFormString(formData, "isPrivate") === "true",
		});

		if (!parsed.success) {
			throw new HTTPException(400, {
				message: parsed.error.issues[0]?.message ?? "Invalid scrap",
			});
		}

		const imageFiles = getImageFiles(formData);
		if (imageFiles.length > MAX_ATTACHMENT_COUNT) {
			throw new HTTPException(400, {
				message: `Images must be ${MAX_ATTACHMENT_COUNT} or fewer`,
			});
		}
		const imageDescriptors: ImageDescriptor[] = [];

		for (const imageFile of imageFiles) {
			const imageType = getImageType({
				contentType: imageFile.type,
				fileNameOrUrl: imageFile.name,
			});

			if (!imageType) {
				throw new HTTPException(400, {
					message:
						"Only JPEG, PNG, WebP, GIF, AVIF, HEIC, or HEIF images are allowed",
				});
			}

			if (imageFile.size > MAX_IMAGE_SIZE) {
				throw new HTTPException(400, { message: "Image file is too large" });
			}

			imageDescriptors.push({
				file: imageFile,
				contentType: imageType,
				keyExtension: imageTypes[imageType],
			});
		}

		if (
			!parsed.data.title &&
			!parsed.data.body &&
			imageDescriptors.length === 0
		) {
			throw new HTTPException(400, {
				message: "Title, body, or image is required",
			});
		}

		const input = parsed.data;
		const sourceUrl = parseHttpUrl(input.title);
		const { client, baseUrl, bucketName } = c.get("r2");
		const fileRepository = createFileRepository(client, c.get("db"), baseUrl);
		const metadata = sourceUrl ? await fetchLinkMetadata(sourceUrl) : null;
		const title = chooseScrapTitle({
			inputTitle: input.title,
			body: input.body,
			metadata,
		});
		const body = input.body || null;
		const kind = getScrapKind({
			sourceUrl,
			body: input.body,
			imageCount: imageDescriptors.length,
		});
		const scrapId = uuidv7();
		const savedAttachments: Array<typeof schema.scrapAttachment.$inferInsert> =
			[];

		for (const [index, imageDescriptor] of imageDescriptors.entries()) {
			const savedFile = await fileRepository.saveBlobFile(
				createBlobFile({
					blob: imageDescriptor.file,
					bucket: bucketName,
					keyPrefix: `${user.id}/scraps/${scrapId}/attachments`,
					contentType: imageDescriptor.contentType,
					keyExtension: imageDescriptor.keyExtension,
				}),
			);
			savedAttachments.push({
				id: uuidv7(),
				scrapId,
				fileId: savedFile.id,
				altText: imageDescriptor.file.name || null,
				position: index,
			});
		}

		let previewImageFileId: string | null = null;
		if (metadata?.imageUrl) {
			previewImageFileId = await saveRemoteImage({
				url: metadata.imageUrl,
				userId: user.id,
				scrapId,
				bucket: bucketName,
				saveBlobFile: fileRepository.saveBlobFile,
			});
		}

		await c.get("db").transaction(async (tx) => {
			await tx.insert(schema.scrap).values({
				id: scrapId,
				userId: user.id,
				title,
				body,
				kind,
				sourceUrl: sourceUrl?.href ?? null,
				isPrivate: input.isPrivate,
			});

			if (metadata && sourceUrl) {
				await tx.insert(schema.scrapLinkPreview).values({
					id: uuidv7(),
					scrapId,
					url: sourceUrl.href,
					title: metadata.title,
					description: metadata.description,
					siteName: metadata.siteName,
					providerName: metadata.providerName,
					authorName: metadata.authorName,
					html: metadata.html,
					imageFileId: previewImageFileId,
					imageAlt: metadata.imageAlt,
					metadataSource: metadata.metadataSource,
					rawMetadata: metadata.rawMetadata,
				});
			}

			if (savedAttachments.length) {
				await tx.insert(schema.scrapAttachment).values(savedAttachments);
			}
		});

		const [scrap] = await getScraps(c.get("db"), user.id, {
			scrapIds: [scrapId],
		});

		if (!scrap) {
			throw new HTTPException(500, { message: "Failed to create scrap" });
		}

		return c.json({ scrap }, 201);
	})
	.delete("/:id", async (c) => {
		const { user } = await getUserOrThrow(c);
		const { id } = getScrapIdOrThrow(c.req.param("id"));
		const db = c.get("db");

		const [targetScrap] = await db
			.select()
			.from(schema.scrap)
			.where(and(eq(schema.scrap.id, id), eq(schema.scrap.userId, user.id)))
			.limit(1);

		if (!targetScrap) {
			throw new HTTPException(404, { message: "Scrap not found" });
		}

		const attachments = await db
			.select({ fileId: schema.scrapAttachment.fileId })
			.from(schema.scrapAttachment)
			.where(eq(schema.scrapAttachment.scrapId, id));
		const previews = await db
			.select({ imageFileId: schema.scrapLinkPreview.imageFileId })
			.from(schema.scrapLinkPreview)
			.where(eq(schema.scrapLinkPreview.scrapId, id));
		const fileIds = [
			...attachments.map((attachment) => attachment.fileId),
			...previews
				.map((preview) => preview.imageFileId)
				.filter((fileId): fileId is string => fileId !== null),
		];

		await db.delete(schema.scrap).where(eq(schema.scrap.id, id));

		const { client, baseUrl } = c.get("r2");
		const fileRepository = createFileRepository(client, db, baseUrl);
		await Promise.all(
			fileIds.map((fileId) => fileRepository.deleteFileById(fileId)),
		);

		return c.json({ scrap: targetScrap });
	});

async function getScraps(
	db: Database,
	userId: string,
	options: {
		publicOnly?: boolean;
		scrapIds?: string[];
		search?: string;
		limit?: number;
		offset?: number;
	} = {},
) {
	const filters = getScrapFilters(userId, options);
	let scrapsQuery = db
		.select()
		.from(schema.scrap)
		.where(and(...filters))
		.orderBy(desc(schema.scrap.createdAt))
		.$dynamic();

	if (typeof options.limit === "number") {
		scrapsQuery = scrapsQuery.limit(options.limit);
	}
	if (typeof options.offset === "number") {
		scrapsQuery = scrapsQuery.offset(options.offset);
	}

	const scraps = await scrapsQuery;
	const scrapIds = scraps.map((scrap) => scrap.id);

	if (!scrapIds.length) {
		return [];
	}

	const previews = await db
		.select()
		.from(schema.scrapLinkPreview)
		.where(inArray(schema.scrapLinkPreview.scrapId, scrapIds));
	const attachments = await db
		.select()
		.from(schema.scrapAttachment)
		.where(inArray(schema.scrapAttachment.scrapId, scrapIds))
		.orderBy(schema.scrapAttachment.position);

	const previewByScrapId = new Map(
		previews.map((preview) => [preview.scrapId, preview]),
	);
	const attachmentsByScrapId = new Map<
		string,
		Array<typeof schema.scrapAttachment.$inferSelect>
	>();

	for (const attachment of attachments) {
		attachmentsByScrapId.set(attachment.scrapId, [
			...(attachmentsByScrapId.get(attachment.scrapId) ?? []),
			attachment,
		]);
	}

	return scraps.map((scrap) => {
		const preview = previewByScrapId.get(scrap.id) ?? null;
		return {
			...scrap,
			linkPreview: preview
				? {
						...preview,
						imageUrl: preview.imageFileId
							? `/api/scraps/files/${preview.imageFileId}`
							: null,
					}
				: null,
			attachments: (attachmentsByScrapId.get(scrap.id) ?? []).map(
				(attachment) => ({
					...attachment,
					url: `/api/scraps/files/${attachment.fileId}`,
				}),
			),
		};
	});
}

async function getScrapCount(
	db: Database,
	userId: string,
	options: { publicOnly?: boolean; scrapIds?: string[]; search?: string } = {},
) {
	const [row] = await db
		.select({ value: count() })
		.from(schema.scrap)
		.where(and(...getScrapFilters(userId, options)));

	return row?.value ?? 0;
}

function getScrapFilters(
	userId: string,
	options: { publicOnly?: boolean; scrapIds?: string[]; search?: string },
) {
	const filters = [eq(schema.scrap.userId, userId)];
	if (options.publicOnly) {
		filters.push(eq(schema.scrap.isPrivate, false));
	}
	if (options.scrapIds?.length) {
		filters.push(inArray(schema.scrap.id, options.scrapIds));
	}
	if (options.search) {
		const pattern = `%${options.search}%`;
		const searchFilter = or(
			ilike(schema.scrap.title, pattern),
			ilike(schema.scrap.body, pattern),
			ilike(schema.scrap.sourceUrl, pattern),
		);
		if (searchFilter) {
			filters.push(searchFilter);
		}
	}

	return filters;
}

async function getReadableScrapFile(c: Context, fileId: string) {
	const currentUser = c.get("user");
	const [attachmentMatch] = await c
		.get("db")
		.select({ file: schema.files, scrap: schema.scrap })
		.from(schema.scrapAttachment)
		.innerJoin(schema.files, eq(schema.scrapAttachment.fileId, schema.files.id))
		.innerJoin(
			schema.scrap,
			eq(schema.scrapAttachment.scrapId, schema.scrap.id),
		)
		.where(eq(schema.scrapAttachment.fileId, fileId))
		.limit(1);

	if (
		attachmentMatch &&
		canReadScrapFile(currentUser?.id, attachmentMatch.scrap)
	) {
		return attachmentMatch.file;
	}

	const [previewMatch] = await c
		.get("db")
		.select({ file: schema.files, scrap: schema.scrap })
		.from(schema.scrapLinkPreview)
		.innerJoin(
			schema.files,
			eq(schema.scrapLinkPreview.imageFileId, schema.files.id),
		)
		.innerJoin(
			schema.scrap,
			eq(schema.scrapLinkPreview.scrapId, schema.scrap.id),
		)
		.where(eq(schema.scrapLinkPreview.imageFileId, fileId))
		.limit(1);

	if (previewMatch && canReadScrapFile(currentUser?.id, previewMatch.scrap)) {
		return previewMatch.file;
	}

	return null;
}

function canReadScrapFile(
	currentUserId: string | undefined,
	scrap: typeof schema.scrap.$inferSelect,
) {
	return canReadScrap(currentUserId, scrap);
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

function getScrapIdOrThrow(value: string) {
	const parsed = scrapIdSchema.safeParse({ id: value });
	if (!parsed.success) {
		throw new HTTPException(404, { message: "Scrap not found" });
	}

	return parsed.data;
}

function getFormString(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}

function getImageFiles(formData: FormData) {
	return formData
		.getAll("images")
		.filter((value): value is File => value instanceof File && value.size > 0);
}

function getScrapKind(params: {
	sourceUrl: URL | null;
	body: string;
	imageCount: number;
}): ScrapKind {
	if (params.sourceUrl) {
		return "link";
	}
	if (params.imageCount > 0) {
		return "image";
	}
	return params.body ? "long_text" : "short_text";
}

function chooseScrapTitle(params: {
	inputTitle: string;
	body: string;
	metadata: LinkMetadata | null;
}) {
	if (params.metadata?.title) {
		return params.metadata.title.slice(0, 500);
	}

	if (params.inputTitle) {
		return params.inputTitle.slice(0, 500);
	}

	const bodyTitle = params.body.split("\n").find(Boolean);
	return (bodyTitle || "画像スクラップ").slice(0, 500);
}

function parseHttpUrl(value: string) {
	try {
		const url = new URL(value.trim());
		return url.protocol === "http:" || url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

async function fetchLinkMetadata(url: URL): Promise<LinkMetadata> {
	const normalizedUrl = normalizeScrapUrl(url);
	const knownProviderMetadata = await fetchKnownProviderOembed(normalizedUrl);
	if (knownProviderMetadata) {
		return knownProviderMetadata;
	}

	const youtubePlayerMetadata = await fetchYouTubePlayerMetadata(
		normalizedUrl,
		fetchWithTimeout,
	);
	if (youtubePlayerMetadata) {
		return metadataFromYouTube({
			url: normalizedUrl.href,
			metadata: youtubePlayerMetadata,
			source: "provider_api",
		});
	}

	try {
		const htmlResponse = await fetchWithTimeout(normalizedUrl.href, {
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": "my-todo-app-scrap-preview-bot/1.0",
			},
		});

		if (!htmlResponse.ok) {
			return emptyMetadata(normalizedUrl.href, {
				status: htmlResponse.status,
				reason: "html_fetch_failed",
			});
		}

		const contentType = htmlResponse.headers.get("content-type") ?? "";
		if (contentType && !contentType.toLowerCase().includes("html")) {
			return emptyMetadata(normalizedUrl.href, {
				contentType,
				reason: "not_html",
			});
		}

		const html = await readMetadataHtml(htmlResponse);
		const oembedUrl = extractOembedHref(html, normalizedUrl);
		const oembed = oembedUrl ? await fetchOembed(oembedUrl) : null;
		const openGraph = extractNamedMetadata(html, "property", "og:");
		const twitter = extractNamedMetadata(html, "name", "twitter:");
		const youtube = extractYouTubeMetadata(html, normalizedUrl);
		const descriptionMetadata = extractNamedMetadata(
			html,
			"name",
			"description",
		);
		const htmlTitle = extractHtmlTitle(html);
		const title = firstString(
			oembed?.title,
			openGraph["og:title"],
			twitter["twitter:title"],
			youtube?.title,
			htmlTitle,
		);
		const description = firstString(
			oembed?.description,
			openGraph["og:description"],
			twitter["twitter:description"],
			youtube?.description,
			descriptionMetadata.description,
		);
		const imageUrl = firstString(
			oembed?.thumbnail_url,
			openGraph["og:image"],
			openGraph["og:image:url"],
			twitter["twitter:image"],
			youtube?.imageUrl,
		);
		const source = oembed?.html
			? "oembed"
			: openGraph["og:title"] || openGraph["og:image"]
				? "open_graph"
				: twitter["twitter:title"] || twitter["twitter:image"]
					? "twitter_card"
					: youtube?.title || htmlTitle
						? "html"
						: "none";

		return {
			url: normalizedUrl.href,
			title,
			description,
			siteName: firstString(openGraph["og:site_name"]),
			providerName: firstString(oembed?.provider_name, youtube?.providerName),
			authorName: firstString(oembed?.author_name, youtube?.authorName),
			html: firstString(oembed?.html),
			imageUrl: imageUrl ? resolveMaybeUrl(imageUrl, normalizedUrl) : null,
			imageAlt: firstString(
				openGraph["og:image:alt"],
				twitter["twitter:image:alt"],
			),
			metadataSource: source,
			rawMetadata: {
				oembed,
				oembedUrl,
				openGraph,
				twitter,
				youtube,
				descriptionMetadata,
				htmlTitle,
				contentType,
				finalUrl: htmlResponse.url,
			},
		};
	} catch {
		return emptyMetadata(normalizedUrl.href, {
			reason: "metadata_fetch_error",
		});
	}
}

function normalizeScrapUrl(url: URL) {
	return normalizeYouTubeUrl(url) ?? url;
}

async function fetchKnownProviderOembed(url: URL) {
	const endpoint = getKnownProviderOembedEndpoint(url);
	if (!endpoint) {
		return null;
	}

	const oembed = await fetchOembed(endpoint);
	if (!oembed) {
		return null;
	}

	return metadataFromOembed({
		url: url.href,
		oembed,
		oembedUrl: endpoint,
	});
}

function getKnownProviderOembedEndpoint(url: URL) {
	const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
	const encodedUrl = encodeURIComponent(url.href);

	if (host === "youtube.com" || host === "youtu.be") {
		return `https://www.youtube.com/oembed?url=${encodedUrl}&format=json`;
	}

	if (host === "vimeo.com" || host === "player.vimeo.com") {
		return `https://vimeo.com/api/oembed.json?url=${encodedUrl}`;
	}

	if (host === "open.spotify.com") {
		return `https://open.spotify.com/oembed?url=${encodedUrl}`;
	}

	if (host === "soundcloud.com") {
		return `https://soundcloud.com/oembed?format=json&url=${encodedUrl}`;
	}

	if (host === "music.apple.com") {
		return `https://music.apple.com/api/oembed?url=${encodedUrl}`;
	}

	return null;
}

function metadataFromOembed(params: {
	url: string;
	oembed: Record<string, unknown>;
	oembedUrl: string;
}): LinkMetadata {
	return {
		url: params.url,
		title: firstString(params.oembed.title),
		description: firstString(params.oembed.description),
		siteName: null,
		providerName: firstString(params.oembed.provider_name),
		authorName: firstString(params.oembed.author_name),
		html: firstString(params.oembed.html),
		imageUrl: firstString(params.oembed.thumbnail_url),
		imageAlt: firstString(params.oembed.title),
		metadataSource: "oembed",
		rawMetadata: {
			oembed: params.oembed,
			oembedUrl: params.oembedUrl,
			finalUrl: params.url,
		},
	};
}

function metadataFromYouTube(params: {
	url: string;
	metadata: YouTubeMetadata;
	source: LinkMetadata["metadataSource"];
}): LinkMetadata {
	return {
		url: params.url,
		title: params.metadata.title,
		description: params.metadata.description,
		siteName: null,
		providerName: params.metadata.providerName,
		authorName: params.metadata.authorName,
		html: null,
		imageUrl: params.metadata.imageUrl,
		imageAlt: params.metadata.title,
		metadataSource: params.source,
		rawMetadata: {
			youtube: params.metadata.rawMetadata ?? null,
		},
	};
}

async function fetchOembed(url: string) {
	try {
		const response = await fetchWithTimeout(url, {
			headers: { Accept: "application/json" },
		});
		if (!response.ok) {
			return null;
		}

		return (await response.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;
	} catch {
		return null;
	}
}

async function readMetadataHtml(response: Response) {
	if (!response.body) {
		return (await response.text()).slice(0, MAX_HTML_METADATA_BYTES);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let html = "";
	let receivedBytes = 0;

	while (receivedBytes < MAX_HTML_METADATA_BYTES) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		receivedBytes += value.byteLength;
		html += decoder.decode(value, { stream: true });
		if (html.toLowerCase().includes("</head>")) {
			break;
		}
	}

	html += decoder.decode();
	return html.slice(0, MAX_HTML_METADATA_BYTES);
}

async function saveRemoteImage(params: {
	url: string;
	userId: string;
	scrapId: string;
	bucket: string;
	saveBlobFile: ReturnType<typeof createFileRepository>["saveBlobFile"];
}) {
	try {
		const response = await fetchWithTimeout(params.url, {
			headers: { Accept: "image/*" },
		});
		if (!response.ok) {
			console.warn("Failed to fetch link preview image", {
				url: params.url,
				status: response.status,
			});
			return null;
		}

		const imageType = getImageType({
			contentType: response.headers.get("content-type") ?? "",
			fileNameOrUrl: params.url,
		});

		if (!imageType) {
			console.warn("Unsupported link preview image type", {
				url: params.url,
				contentType: response.headers.get("content-type"),
			});
			return null;
		}

		const blob = await response.blob();
		if (blob.size > MAX_IMAGE_SIZE) {
			console.warn("Link preview image is too large", {
				url: params.url,
				size: blob.size,
			});
			return null;
		}

		const savedFile = await params.saveBlobFile(
			createBlobFile({
				blob,
				bucket: params.bucket,
				keyPrefix: `${params.userId}/scraps/${params.scrapId}/preview`,
				contentType: imageType,
				keyExtension: imageTypes[imageType],
			}),
		);

		return savedFile.id;
	} catch (error) {
		console.warn("Failed to save link preview image", {
			url: params.url,
			error: toLoggableError(error),
		});
		return null;
	}
}

function toLoggableError(error: unknown) {
	if (error instanceof Error) {
		return {
			message: error.message,
			cause: error.cause,
		};
	}

	return error;
}

function getImageType(params: {
	contentType: string | null | undefined;
	fileNameOrUrl: string;
}): ImageType | null {
	const normalizedContentType = normalizeImageContentType(params.contentType);
	if (normalizedContentType && normalizedContentType in imageTypes) {
		return normalizedContentType as ImageType;
	}

	return getImageTypeFromExtension(params.fileNameOrUrl);
}

function normalizeImageContentType(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const contentType = value.split(";")[0]?.trim().toLowerCase();
	if (!contentType) {
		return null;
	}

	return contentType === "image/jpg" ? "image/jpeg" : contentType;
}

function getImageTypeFromExtension(value: string) {
	const extension = getExtension(value);
	if (!extension) {
		return null;
	}

	const matchedEntry = Object.entries(imageTypes).find(
		([, imageExtension]) => imageExtension === extension,
	);
	return (matchedEntry?.[0] as ImageType | undefined) ?? null;
}

function getExtension(value: string) {
	try {
		return getExtensionFromPath(new URL(value).pathname);
	} catch {
		return getExtensionFromPath(value);
	}
}

function getExtensionFromPath(value: string) {
	const extension = value.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? null;
	return extension === ".jpeg" ? ".jpg" : extension;
}

function emptyMetadata(
	url: string,
	metadata: Record<string, unknown> = {},
): LinkMetadata {
	return {
		url,
		title: null,
		description: null,
		siteName: null,
		providerName: null,
		authorName: null,
		html: null,
		imageUrl: null,
		imageAlt: null,
		metadataSource: "none",
		rawMetadata: metadata,
	};
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(input, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
}

function extractNamedMetadata(
	html: string,
	nameAttribute: "name" | "property",
	prefix: string,
) {
	const result: Record<string, string> = {};
	const metaPattern = /<meta\s+([^>]+?)>/gi;
	let match: RegExpExecArray | null;

	match = metaPattern.exec(html);
	while (match) {
		const attributes = parseAttributes(match[1] ?? "");
		const name = attributes[nameAttribute]?.toLowerCase();
		const content = attributes.content;
		if (name?.startsWith(prefix) && content) {
			result[name] = decodeHtml(content);
		}
		match = metaPattern.exec(html);
	}

	return result;
}

function extractOembedHref(html: string, baseUrl: URL) {
	const linkPattern = /<link\s+([^>]+?)>/gi;
	let match: RegExpExecArray | null;

	match = linkPattern.exec(html);
	while (match) {
		const attributes = parseAttributes(match[1] ?? "");
		const type = attributes.type?.toLowerCase();
		const rel = attributes.rel?.toLowerCase();
		const isOembedType =
			type === "application/json+oembed" || type === "text/xml+oembed";
		if (rel?.includes("alternate") && isOembedType && attributes.href) {
			return resolveMaybeUrl(attributes.href, baseUrl);
		}
		match = linkPattern.exec(html);
	}

	return null;
}

function parseAttributes(value: string) {
	const result: Record<string, string> = {};
	const pattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
	let match: RegExpExecArray | null;

	match = pattern.exec(value);
	while (match) {
		result[match[1]?.toLowerCase() ?? ""] =
			match[3] ?? match[4] ?? match[5] ?? "";
		match = pattern.exec(value);
	}

	return result;
}

function extractHtmlTitle(html: string) {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return match?.[1] ? decodeHtml(stripTags(match[1]).trim()) : null;
}

function stripTags(value: string) {
	return value.replace(/<[^>]*>/g, "");
}

function decodeHtml(value: string) {
	return value
		.replaceAll("&amp;", "&")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&nbsp;", " ")
		.trim();
}

function resolveMaybeUrl(value: string, baseUrl: URL) {
	try {
		return new URL(value, baseUrl).href;
	} catch {
		return null;
	}
}

function firstString(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return null;
}

export default app;
