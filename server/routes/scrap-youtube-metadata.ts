export type YouTubeMetadata = {
	title: string | null;
	description: string | null;
	providerName: "YouTube";
	authorName: string | null;
	imageUrl: string | null;
};

export function normalizeYouTubeUrl(url: URL) {
	const host = normalizeYouTubeHost(url.hostname);
	const videoId = getYouTubeVideoId(url);

	if (!videoId || (host !== "youtube.com" && host !== "youtu.be")) {
		return null;
	}

	return new URL(`https://www.youtube.com/watch?v=${videoId}`);
}

export function getYouTubeMaxResThumbnailUrl(url: URL) {
	const videoId = getYouTubeVideoId(url);
	return videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;
}

export function extractYouTubeMetadata(
	html: string,
	url: URL,
): YouTubeMetadata | null {
	if (!getYouTubeVideoId(url)) {
		return null;
	}

	const playerResponse = extractYouTubePlayerResponse(html);
	const videoDetails = asRecord(playerResponse?.videoDetails);
	if (!videoDetails) {
		return null;
	}

	return {
		title: firstString(videoDetails.title),
		description: firstString(videoDetails.shortDescription),
		providerName: "YouTube",
		authorName: firstString(videoDetails.author),
		imageUrl: getYouTubeThumbnailUrl(videoDetails.thumbnail),
	};
}

function getYouTubeVideoId(url: URL) {
	const host = normalizeYouTubeHost(url.hostname);

	if (host === "youtu.be") {
		return getValidYouTubeId(url.pathname.split("/").filter(Boolean)[0]);
	}

	if (host !== "youtube.com") {
		return null;
	}

	const watchVideoId = getValidYouTubeId(url.searchParams.get("v"));
	if (watchVideoId) {
		return watchVideoId;
	}

	const [kind, id] = url.pathname.split("/").filter(Boolean);
	if (["shorts", "embed", "live"].includes(kind ?? "")) {
		return getValidYouTubeId(id);
	}

	return null;
}

function normalizeYouTubeHost(hostname: string) {
	return hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
}

function getValidYouTubeId(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	return /^[\w-]{11}$/.test(value) ? value : null;
}

function extractYouTubePlayerResponse(html: string) {
	const markers = ["ytInitialPlayerResponse =", "ytInitialPlayerResponse="];

	for (const marker of markers) {
		const markerIndex = html.indexOf(marker);
		if (markerIndex === -1) {
			continue;
		}

		const json = extractJsonObject(html, markerIndex + marker.length);
		if (!json) {
			continue;
		}

		try {
			return JSON.parse(json) as Record<string, unknown>;
		} catch {
			return null;
		}
	}

	return null;
}

function extractJsonObject(value: string, startIndex: number) {
	const objectStart = value.indexOf("{", startIndex);
	if (objectStart === -1) {
		return null;
	}

	let depth = 0;
	let isInString = false;
	let isEscaped = false;

	for (let index = objectStart; index < value.length; index += 1) {
		const char = value[index];

		if (isInString) {
			if (isEscaped) {
				isEscaped = false;
			} else if (char === "\\") {
				isEscaped = true;
			} else if (char === '"') {
				isInString = false;
			}
			continue;
		}

		if (char === '"') {
			isInString = true;
			continue;
		}

		if (char === "{") {
			depth += 1;
		} else if (char === "}") {
			depth -= 1;
			if (depth === 0) {
				return value.slice(objectStart, index + 1);
			}
		}
	}

	return null;
}

function asRecord(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function getYouTubeThumbnailUrl(value: unknown) {
	const thumbnail = asRecord(value);
	const thumbnails = Array.isArray(thumbnail?.thumbnails)
		? thumbnail.thumbnails
		: [];
	let bestThumbnail: { url: string; width: number } | null = null;

	for (const thumbnailValue of thumbnails) {
		const thumbnailRecord = asRecord(thumbnailValue);
		const url = firstString(thumbnailRecord?.url);
		const width = Number(thumbnailRecord?.width ?? 0);
		if (!url) {
			continue;
		}

		if (!bestThumbnail || width > bestThumbnail.width) {
			bestThumbnail = { url, width: Number.isFinite(width) ? width : 0 };
		}
	}

	return bestThumbnail?.url ?? null;
}

function firstString(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return null;
}
