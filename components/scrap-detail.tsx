"use client";

import {
	Bookmark,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Link as LinkIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { Scrap, ScrapKind, ScrapLinkPreview } from "./scrap-types";

export const kindLabels: Record<ScrapKind, string> = {
	short_text: "メモ",
	long_text: "ノート",
	link: "リンク",
	image: "画像",
};

export const kindIcons = {
	short_text: Bookmark,
	long_text: FileText,
	link: LinkIcon,
	image: ImageIcon,
} satisfies Record<ScrapKind, typeof Bookmark>;

const embedMessageType = "iframe-sandbox:render";

export function ScrapDetail({
	scrap,
	isDialog = false,
}: {
	scrap: Scrap;
	isDialog?: boolean;
}) {
	const Icon = kindIcons[scrap.kind];
	const hasMedia = scrap.linkPreview !== null || scrap.attachments.length > 0;
	const isPage = !isDialog;
	const title = isDialog ? (
		<DialogTitle className="break-all text-2xl leading-tight">
			{scrap.title}
		</DialogTitle>
	) : (
		<h1 className="break-all font-semibold text-3xl leading-tight tracking-tight sm:text-4xl">
			{scrap.title}
		</h1>
	);
	const sourceUrl = scrap.sourceUrl ? (
		<a
			href={scrap.sourceUrl}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-1 break-all text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
		>
			<ExternalLink className="size-3" />
			{scrap.sourceUrl}
		</a>
	) : null;

	return (
		<div className={cn("space-y-6", isPage && "space-y-8")}>
			<div
				className={cn(
					"grid gap-6",
					isPage && "gap-8",
					hasMedia &&
						(isPage
							? "lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)]"
							: "lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]"),
				)}
			>
				<div className={cn("space-y-5", isPage && "lg:pt-2")}>
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
						<div className="border-border border-l-2 pl-5">
							<p
								className={cn(
									"whitespace-pre-wrap text-foreground leading-7",
									isPage ? "text-base sm:text-lg sm:leading-8" : "text-sm",
								)}
							>
								{scrap.body}
							</p>
						</div>
					) : null}
				</div>

				{hasMedia ? (
					<div className={cn("space-y-4 lg:pr-1", isPage && "lg:pr-0")}>
						{scrap.linkPreview ? (
							<LinkPreview preview={scrap.linkPreview} isPage={isPage} />
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
											className={cn(
												"overflow-hidden bg-muted",
												isPage
													? "rounded-3xl"
													: "rounded-2xl border border-border",
											)}
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

function LinkPreview({
	preview,
	isPage = false,
}: {
	preview: ScrapLinkPreview;
	isPage?: boolean;
}) {
	const embedSize = preview.html ? getEmbedSize(preview.html) : null;
	const embedStyle = embedSize?.width
		? { aspectRatio: `${embedSize.width} / ${embedSize.height}` }
		: embedSize?.height
			? { height: `${embedSize.height}px` }
			: { aspectRatio: "16 / 9" };
	const sandbox = preview.html ? getIframeSandbox() : null;

	if (preview.html && sandbox) {
		return (
			<div className="w-full overflow-hidden" style={embedStyle}>
				<SandboxedEmbed
					html={preview.html}
					title={preview.title ?? "oEmbed preview"}
					sandbox={sandbox}
					className="size-full border-0"
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"overflow-hidden bg-card",
				isPage ? "rounded-3xl" : "rounded-2xl border border-border shadow-sm",
			)}
		>
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

function SandboxedEmbed({
	html,
	title,
	sandbox,
	className,
}: {
	html: string;
	title: string;
	sandbox: { src: string; targetOrigin: string };
	className?: string;
}) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		if (!isLoaded) {
			return;
		}

		iframeRef.current?.contentWindow?.postMessage(
			{ type: embedMessageType, html },
			sandbox.targetOrigin,
		);
	}, [html, isLoaded, sandbox.targetOrigin]);

	return (
		<iframe
			ref={iframeRef}
			title={title}
			src={sandbox.src}
			sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
			className={className}
			onLoad={() => setIsLoaded(true)}
		/>
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

export function formatHost(value: string) {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
}

function getIframeSandbox() {
	const baseUrl =
		process.env.NEXT_PUBLIC_IFRAME_SANDBOX_URL ||
		(process.env.NODE_ENV === "development" ? "http://localhost:8787" : "");

	if (!baseUrl) {
		return null;
	}

	try {
		const url = new URL(baseUrl);
		url.hash = "";
		url.search = "";
		if (!url.pathname.endsWith("/embed")) {
			url.pathname = `${url.pathname.replace(/\/$/, "")}/embed`;
		}
		return { src: url.href, targetOrigin: url.origin };
	} catch {
		return null;
	}
}

export function dispatchScrapDeleted(scrapId: string) {
	window.dispatchEvent(
		new CustomEvent<{ id: string }>("scrap:deleted", {
			detail: { id: scrapId },
		}),
	);
}
