import { describe, expect, it } from "vitest";

import { getYouTubeMaxResThumbnailUrl } from "./scrap-youtube-metadata";

describe("getYouTubeMaxResThumbnailUrl", () => {
	it("YouTube URL から maxresdefault のサムネイル URL を作る", () => {
		expect(
			getYouTubeMaxResThumbnailUrl(
				new URL("https://youtu.be/_jB9AuP7quw?list=playlist_id"),
			),
		).toBe("https://i.ytimg.com/vi/_jB9AuP7quw/maxresdefault.jpg");
		expect(
			getYouTubeMaxResThumbnailUrl(
				new URL("https://www.youtube.com/shorts/_jB9AuP7quw"),
			),
		).toBe("https://i.ytimg.com/vi/_jB9AuP7quw/maxresdefault.jpg");
	});

	it("YouTube 以外の URL は null を返す", () => {
		expect(getYouTubeMaxResThumbnailUrl(new URL("https://example.com"))).toBe(
			null,
		);
	});
});
