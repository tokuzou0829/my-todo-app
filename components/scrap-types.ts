export type ScrapKind = "short_text" | "long_text" | "link" | "image";

export type ScrapAttachment = {
	id: string;
	scrapId: string;
	fileId: string;
	altText: string | null;
	position: number;
	createdAt: string;
	url: string;
};

export type ScrapLinkPreview = {
	id: string;
	scrapId: string;
	url: string;
	title: string | null;
	description: string | null;
	siteName: string | null;
	providerName: string | null;
	authorName: string | null;
	html: string | null;
	imageFileId: string | null;
	imageAlt: string | null;
	metadataSource: string;
	createdAt: string;
	imageUrl: string | null;
};

export type Scrap = {
	id: string;
	userId: string;
	title: string;
	body: string | null;
	kind: ScrapKind;
	sourceUrl: string | null;
	isPrivate: boolean;
	createdAt: string;
	updatedAt: string;
	linkPreview: ScrapLinkPreview | null;
	attachments: ScrapAttachment[];
};

export type ScrapsResponse = {
	scraps: Scrap[];
	owner: { id: string; name: string } | null;
	isReadOnly: boolean;
	pagination: {
		page: number;
		perPage: number;
		total: number;
		pageCount: number;
	};
};

export type ScrapResponse = {
	scrap: Scrap;
};
