"use client";

import {
	Bookmark,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Link as LinkIcon,
	Lock,
	Paperclip,
	Trash2,
	X,
} from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ScrapKind = "short_text" | "long_text" | "link" | "image";

type ScrapAttachment = {
	id: string;
	scrapId: string;
	fileId: string;
	altText: string | null;
	position: number;
	createdAt: string;
	url: string;
};

type ScrapLinkPreview = {
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

type Scrap = {
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

type ScrapsResponse = {
	scraps: Scrap[];
	owner: { id: string; name: string } | null;
	isReadOnly: boolean;
};

type ScrapResponse = {
	scrap: Scrap;
};

const kindLabels: Record<ScrapKind, string> = {
	short_text: "短文",
	long_text: "長文",
	link: "リンク",
	image: "画像",
};

const kindIcons = {
	short_text: Bookmark,
	long_text: FileText,
	link: LinkIcon,
	image: ImageIcon,
} satisfies Record<ScrapKind, typeof Bookmark>;

export function ScrapApp({ isReadOnly = false }: { isReadOnly?: boolean }) {
	const [scraps, setScraps] = useState<Scrap[]>([]);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [images, setImages] = useState<File[]>([]);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [isPrivate, setIsPrivate] = useState(false);
	const [selectedScrap, setSelectedScrap] = useState<Scrap | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingScrapId, setDeletingScrapId] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;

		const loadScraps = async () => {
			setError(null);
			const response = await apiClient.api.scraps.$get();

			if (!response.ok) {
				if (!ignore) {
					setError(
						await getErrorMessage(response, "スクラップの取得に失敗しました"),
					);
					setIsLoading(false);
				}
				return;
			}

			const json = (await response.json()) as ScrapsResponse;
			if (!ignore) {
				setScraps(json.scraps);
				setIsLoading(false);
			}
		};

		void loadScraps();

		return () => {
			ignore = true;
		};
	}, []);

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedTitle = title.trim();
		const trimmedBody = body.trim();

		if (!trimmedTitle && !trimmedBody && images.length === 0) {
			return;
		}

		const formData = new FormData();
		formData.append("title", trimmedTitle);
		formData.append("body", trimmedBody);
		formData.append("isPrivate", String(isPrivate));
		for (const image of images) {
			formData.append("images", image);
		}

		setIsSaving(true);
		setError(null);

		const response = await fetch("/api/scraps", {
			method: "POST",
			body: formData,
			credentials: "include",
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(response, "スクラップの追加に失敗しました"),
			);
			setIsSaving(false);
			return;
		}

		const json = (await response.json()) as ScrapResponse;
		setScraps((current) => [json.scrap, ...current]);
		resetForm();
		setIsSaving(false);
	};

	const handleImagesChange = (files: FileList | null) => {
		const selectedImages = Array.from(files ?? []);
		setImages((current) => {
			const nextImages = [...current, ...selectedImages].slice(0, 4);
			if (current.length + selectedImages.length > 4) {
				setError("画像は1投稿につき4枚までです。先頭4枚だけを添付します。");
			}
			return nextImages;
		});
		setFileInputKey((current) => current + 1);
	};

	const removeImage = (index: number) => {
		setImages((current) =>
			current.filter((_, currentIndex) => currentIndex !== index),
		);
	};

	const resetForm = () => {
		setTitle("");
		setBody("");
		setImages([]);
		setIsPrivate(false);
		setFileInputKey((current) => current + 1);
	};

	const deleteScrap = async (scrap: Scrap) => {
		setDeletingScrapId(scrap.id);
		setError(null);
		setScraps((current) => current.filter((item) => item.id !== scrap.id));
		setSelectedScrap(null);

		const response = await apiClient.api.scraps[":id"].$delete({
			param: { id: scrap.id },
		});

		if (!response.ok) {
			setScraps((current) => sortScraps([scrap, ...current]));
			setError(
				await getErrorMessage(response, "スクラップの削除に失敗しました"),
			);
		}

		setDeletingScrapId(null);
	};

	return (
		<div className="space-y-8">
			<section className="space-y-6">
				{isReadOnly ? null : (
					<ScrapComposer
						onSubmit={handleCreate}
						title={title}
						onTitleChange={setTitle}
						body={body}
						onBodyChange={setBody}
						images={images}
						fileInputKey={fileInputKey}
						onImagesChange={handleImagesChange}
						onRemoveImage={removeImage}
						isPrivate={isPrivate}
						onPrivateChange={setIsPrivate}
						isSaving={isSaving}
					/>
				)}

				{error ? (
					<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
						{error}
					</p>
				) : null}

				{isLoading ? (
					<p className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
						スクラップを読み込んでいます...
					</p>
				) : scraps.length ? (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{scraps.map((scrap, index) => (
							<ScrapCard
								key={scrap.id}
								scrap={scrap}
								loadImageEagerly={index < 3}
								onOpen={() => setSelectedScrap(scrap)}
							/>
						))}
					</div>
				) : (
					<div className="rounded-2xl border border-primary/40 border-dashed bg-primary/5 px-4 py-12 text-center">
						<p className="font-semibold text-foreground text-sm">
							まだスクラップはありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{isReadOnly
								? "公開されているスクラップはありません。"
								: "短文、記事リンク、画像メモを残していきましょう。"}
						</p>
					</div>
				)}
			</section>

			<ScrapDetailDialog
				scrap={selectedScrap}
				isReadOnly={isReadOnly}
				isDeleting={selectedScrap?.id === deletingScrapId}
				onClose={() => setSelectedScrap(null)}
				onDelete={(scrap) => void deleteScrap(scrap)}
			/>
		</div>
	);
}

function ScrapComposer({
	onSubmit,
	title,
	onTitleChange,
	body,
	onBodyChange,
	images,
	fileInputKey,
	onImagesChange,
	onRemoveImage,
	isPrivate,
	onPrivateChange,
	isSaving,
}: {
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	title: string;
	onTitleChange: (value: string) => void;
	body: string;
	onBodyChange: (value: string) => void;
	images: File[];
	fileInputKey: number;
	onImagesChange: (files: FileList | null) => void;
	onRemoveImage: (index: number) => void;
	isPrivate: boolean;
	onPrivateChange: (value: boolean) => void;
	isSaving: boolean;
}) {
	const bodyRef = useRef<HTMLTextAreaElement>(null);

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm transition focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
				<Label htmlFor="scrap-title" className="sr-only">
					タイトル / URL
				</Label>
				<Input
					id="scrap-title"
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key !== "Enter" || event.nativeEvent.isComposing) {
							return;
						}

						if (event.metaKey || event.ctrlKey) {
							event.preventDefault();
							event.currentTarget.form?.requestSubmit();
							return;
						}

						event.preventDefault();
						bodyRef.current?.focus();
					}}
					placeholder="タイトル、URL"
					className="h-12 border-0 bg-transparent px-4 text-base shadow-none focus-visible:ring-0"
				/>
				<Label htmlFor="scrap-body" className="sr-only">
					本文 / コメント
				</Label>
				<textarea
					id="scrap-body"
					ref={bodyRef}
					value={body}
					onChange={(event) => onBodyChange(event.target.value)}
					onKeyDown={(event) => {
						if (
							event.key !== "Enter" ||
							event.nativeEvent.isComposing ||
							(!event.metaKey && !event.ctrlKey)
						) {
							return;
						}

						event.preventDefault();
						event.currentTarget.form?.requestSubmit();
					}}
					placeholder="本文やコメントを追加"
					className="min-h-28 w-full resize-none border-0 bg-transparent px-4 py-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
				/>
				<div className="flex flex-wrap items-center justify-between gap-3 border-border border-t px-3 py-2">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						<Label
							htmlFor="scrap-images"
							className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
						>
							<Paperclip className="size-4" />
							<span className="sr-only">画像を添付</span>
						</Label>
						<span className="text-muted-foreground text-xs">最大4枚</span>
						{images.map((image, index) => (
							<span
								key={`${image.name}-${image.lastModified}`}
								className="inline-flex max-w-44 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-1 pl-2 text-xs"
							>
								<span className="truncate text-muted-foreground">
									{image.name}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="size-5 text-muted-foreground hover:text-destructive"
									onClick={() => onRemoveImage(index)}
									aria-label={`${image.name} を外す`}
								>
									<X className="size-3" />
								</Button>
							</span>
						))}
					</div>
					<Button
						type="submit"
						disabled={
							isSaving || (!title.trim() && !body.trim() && images.length === 0)
						}
					>
						{isSaving ? "追加中..." : "追加"}
					</Button>
				</div>
				<Input
					key={fileInputKey}
					id="scrap-images"
					type="file"
					accept="image/*"
					multiple
					onChange={(event) => onImagesChange(event.target.files)}
					className="sr-only"
				/>
			</div>

			<div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
				<Checkbox
					id="scrap-private"
					checked={isPrivate}
					onCheckedChange={(checked) => onPrivateChange(checked === true)}
					className="mt-0.5"
				/>
				<Label htmlFor="scrap-private" className="block font-normal">
					<span className="block font-medium text-foreground">
						非公開にする
					</span>
					<span className="block text-muted-foreground text-xs">
						未ログインの公開表示から除外されます。
					</span>
				</Label>
			</div>
		</form>
	);
}

function ScrapDetailDialog({
	scrap,
	isReadOnly,
	isDeleting,
	onClose,
	onDelete,
}: {
	scrap: Scrap | null;
	isReadOnly: boolean;
	isDeleting: boolean;
	onClose: () => void;
	onDelete: (scrap: Scrap) => void;
}) {
	return (
		<Dialog open={scrap !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-5xl">
				<div className="max-h-[calc(90vh-4.5rem)] overflow-y-auto overscroll-contain bg-background p-6">
					{scrap ? <ScrapDetail scrap={scrap} /> : null}
				</div>
				{scrap && !isReadOnly ? (
					<DialogFooter className="shrink-0 border-border border-t bg-background p-4">
						<Button
							variant="outline"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(scrap)}
							disabled={isDeleting}
						>
							<Trash2 className="size-4" />
							{isDeleting ? "削除中..." : "削除"}
						</Button>
					</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ScrapCard({
	scrap,
	loadImageEagerly,
	onOpen,
}: {
	scrap: Scrap;
	loadImageEagerly: boolean;
	onOpen: () => void;
}) {
	const Icon = kindIcons[scrap.kind];
	const heroImage =
		scrap.linkPreview?.imageUrl ?? scrap.attachments[0]?.url ?? null;

	return (
		<button
			type="button"
			className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			onClick={onOpen}
		>
			{heroImage ? (
				<div className="relative aspect-[1.8] overflow-hidden bg-muted">
					<Image
						src={heroImage}
						alt={scrap.linkPreview?.imageAlt ?? scrap.title}
						fill
						loading={loadImageEagerly ? "eager" : "lazy"}
						sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
						unoptimized
						className="object-cover transition duration-300 group-hover:scale-[1.03]"
					/>
					{scrap.attachments.length > 1 ? (
						<Badge className="absolute bottom-3 right-3 bg-background/90 text-foreground shadow-sm">
							画像 {scrap.attachments.length}
						</Badge>
					) : null}
				</div>
			) : (
				<div className="grid aspect-[1.8] place-items-center bg-muted/50 text-muted-foreground">
					<Icon className="size-8" />
				</div>
			)}

			<div className="flex flex-1 flex-col gap-4 p-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="gap-1">
						<Icon className="size-3" />
						{kindLabels[scrap.kind]}
					</Badge>
					{scrap.isPrivate ? (
						<Badge variant="outline" className="gap-1 text-muted-foreground">
							<Lock className="size-3" />
							非公開
						</Badge>
					) : null}
				</div>

				<div className="space-y-2">
					<h3 className="line-clamp-2 font-semibold text-foreground text-lg leading-snug">
						{scrap.title}
					</h3>
					{scrap.linkPreview?.description ? (
						<p className="line-clamp-3 text-muted-foreground text-sm leading-6">
							{scrap.linkPreview.description}
						</p>
					) : scrap.body ? (
						<p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground text-sm leading-6">
							{scrap.body}
						</p>
					) : null}
				</div>

				<div className="mt-auto flex items-center justify-between gap-3 text-muted-foreground text-xs">
					<span>{formatDate(scrap.createdAt)}</span>
					{scrap.sourceUrl ? (
						<span className="inline-flex min-w-0 items-center gap-1">
							<ExternalLink className="size-3" />
							<span className="truncate">{formatHost(scrap.sourceUrl)}</span>
						</span>
					) : null}
				</div>
			</div>
		</button>
	);
}

function ScrapDetail({ scrap }: { scrap: Scrap }) {
	const Icon = kindIcons[scrap.kind];
	const hasMedia = scrap.linkPreview !== null || scrap.attachments.length > 0;

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
						<DialogTitle className="text-2xl leading-tight">
							{scrap.title}
						</DialogTitle>
						{scrap.sourceUrl ? (
							<DialogDescription asChild>
								<a
									href={scrap.sourceUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 break-all text-primary-foreground underline-offset-4 hover:underline"
								>
									<ExternalLink className="size-3" />
									{scrap.sourceUrl}
								</a>
							</DialogDescription>
						) : null}
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

function formatDate(value: string) {
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

function sortScraps(scraps: Scrap[]) {
	return [...scraps].sort(
		(left, right) =>
			new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
	);
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

function formatHost(value: string) {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? fallback;
}
