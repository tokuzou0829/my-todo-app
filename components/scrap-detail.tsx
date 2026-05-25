"use client";

import {
	Bookmark,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Link as LinkIcon,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { Scrap, ScrapKind, ScrapLinkPreview } from "./scrap-types";

export const kindLabels: Record<ScrapKind, string> = {
	short_text: "短文",
	long_text: "長文",
	link: "リンク",
	image: "画像",
};

export const kindIcons = {
	short_text: Bookmark,
	long_text: FileText,
	link: LinkIcon,
	image: ImageIcon,
} satisfies Record<ScrapKind, typeof Bookmark>;

export function ScrapDetail({
	scrap,
	isDialog = false,
}: {
	scrap: Scrap;
	isDialog?: boolean;
}) {
	const Icon = kindIcons[scrap.kind];
	const hasMedia = scrap.linkPreview !== null || scrap.attachments.length > 0;
	const title = isDialog ? (
		<DialogTitle className="break-all text-2xl leading-tight">
			{scrap.title}
		</DialogTitle>
	) : (
		<h1 className="font-semibold text-2xl leading-tight">{scrap.title}</h1>
	);
	const sourceUrl = scrap.sourceUrl ? (
		<a
			href={scrap.sourceUrl}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-1 break-all text-primary-foreground underline-offset-4 hover:underline"
		>
			<ExternalLink className="size-3" />
			{scrap.sourceUrl}
		</a>
	) : null;

	return (
		<div className="space-y-6">
			<div
				className={cn(
					"grid gap-6",
					hasMedia && "lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]",
				)}
			>
				<div className="space-y-5">
					<DialogHeader>
						<div className="flex flex-wrap items-center gap-2 pr-8">
							<Badge variant="secondary" className="gap-1">
								<Icon className="size-3" />
								{kindLabels[scrap.kind]}
							</Badge>
							{scrap.isPrivate ? <Badge variant="outline">非公開</Badge> : null}
							<span className="text-muted-foreground text-xs">
								{formatDate(scrap.createdAt)}
							</span>
						</div>
						{title}
						{sourceUrl && isDialog ? (
							<DialogDescription asChild>{sourceUrl}</DialogDescription>
						) : (
							sourceUrl
						)}
					</DialogHeader>

					{scrap.body ? (
						<div className="rounded-2xl border border-border bg-muted/30 p-4">
							<p className="whitespace-pre-wrap text-foreground text-sm leading-7">
								{scrap.body}
							</p>
						</div>
					) : null}
				</div>

				{hasMedia ? (
					<div className="space-y-4 lg:pr-1">
						{scrap.linkPreview ? (
							<LinkPreview preview={scrap.linkPreview} />
						) : null}

						{scrap.attachments.length ? (
							<div className="space-y-3">
								<h4 className="font-semibold text-foreground text-sm">
									添付画像
								</h4>
								<div
									className={cn(
										"grid gap-3",
										scrap.attachments.length > 1 &&
											"sm:grid-cols-2 lg:grid-cols-1",
									)}
								>
									{scrap.attachments.map((attachment) => (
										<a
											key={attachment.id}
											href={attachment.url}
											target="_blank"
											rel="noreferrer"
											className="overflow-hidden rounded-2xl border border-border bg-muted"
										>
											<Image
												src={attachment.url}
												alt={attachment.altText ?? scrap.title}
												width={960}
												height={640}
												unoptimized
												className="max-h-[28rem] w-full object-contain"
											/>
										</a>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}

function LinkPreview({ preview }: { preview: ScrapLinkPreview }) {
	const embedSize = preview.html ? getEmbedSize(preview.html) : null;
	const embedStyle = embedSize?.width
		? { aspectRatio: `${embedSize.width} / ${embedSize.height}` }
		: embedSize?.height
			? { height: `${embedSize.height}px` }
			: { aspectRatio: "16 / 9" };

	if (preview.html) {
		return (
			<div className="w-full overflow-hidden" style={embedStyle}>
				<iframe
					title={preview.title ?? "oEmbed preview"}
					srcDoc={createEmbedDocument(preview.html)}
					sandbox="allow-scripts allow-same-origin allow-popups"
					className="size-full border-0"
				/>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			{preview.imageUrl ? (
				<Image
					src={preview.imageUrl}
					alt={preview.imageAlt ?? preview.title ?? "リンクプレビュー画像"}
					width={1200}
					height={630}
					unoptimized
					className="max-h-96 w-full object-cover"
				/>
			) : null}
			<div className="space-y-3 p-4">
				<p className="text-muted-foreground text-xs">
					{preview.providerName ?? preview.siteName ?? formatHost(preview.url)}
				</p>
				{preview.title ? (
					<h4 className="font-semibold text-foreground leading-snug">
						{preview.title}
					</h4>
				) : null}
				{preview.description ? (
					<p className="text-muted-foreground text-sm leading-6">
						{preview.description}
					</p>
				) : null}
			</div>
		</div>
	);
}

export function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "日時不明";
	}

	return new Intl.DateTimeFormat("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function getEmbedSize(html: string) {
	const width = getNumericHtmlAttribute(html, "width");
	const height = getNumericHtmlAttribute(html, "height");

	if (!height) {
		return null;
	}

	return { width, height };
}

function getNumericHtmlAttribute(html: string, name: string) {
	const match = html.match(
		new RegExp(`${name}=["']?([0-9]+)(?:px)?(?=["'\\s>])`, "i"),
	);
	if (!match?.[1]) {
		return null;
	}

	const value = Number(match[1]);
	return Number.isFinite(value) && value > 0 ? value : null;
}

function createEmbedDocument(html: string) {
	return `<!doctype html>
<html>
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<style>
			html, body { margin: 0; width: 100%; height: 100%; background: transparent; }
			body { display: grid; place-items: center; overflow: hidden; }
			iframe, embed, object, video { width: 100% !important; height: 100% !important; border: 0; }
			blockquote { max-width: 100% !important; margin: 0 !important; }
		</style>
	</head>
	<body>${html}</body>
</html>`;
}

export function formatHost(value: string) {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
}

export function dispatchScrapDeleted(scrapId: string) {
	window.dispatchEvent(
		new CustomEvent<{ id: string }>("scrap:deleted", {
			detail: { id: scrapId },
		}),
	);
}
