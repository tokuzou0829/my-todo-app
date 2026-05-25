"use client";

import { ExternalLink, Lock, Paperclip, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { apiClient } from "@/lib/api-client";
import { formatDate, formatHost, kindIcons, kindLabels } from "./scrap-detail";
import type { Scrap, ScrapsResponse } from "./scrap-types";

const SCRAPS_PER_PAGE = 30;

export function ScrapApp({ isReadOnly = false }: { isReadOnly?: boolean }) {
	const [scraps, setScraps] = useState<Scrap[]>([]);
	const [request, setRequest] = useState({ page: 1, reloadKey: 0, search: "" });
	const [pagination, setPagination] = useState({
		page: 1,
		perPage: SCRAPS_PER_PAGE,
		total: 0,
		pageCount: 0,
	});
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [images, setImages] = useState<File[]>([]);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [isPrivate, setIsPrivate] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let ignore = false;
		const queryPage = request.page;

		const loadScraps = async () => {
			setIsLoading(true);
			setError(null);
			const response = await apiClient.api.scraps.$get({
				query: {
					page: String(queryPage),
					perPage: String(SCRAPS_PER_PAGE),
					...(request.search ? { q: request.search } : {}),
				},
			});

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
				if (
					json.scraps.length === 0 &&
					json.pagination.total > 0 &&
					queryPage > 1
				) {
					setRequest((current) => ({
						...current,
						page: Math.max(1, json.pagination.pageCount),
					}));
					return;
				}

				setScraps(json.scraps);
				setPagination(json.pagination);
				setIsLoading(false);
			}
		};

		void loadScraps();

		return () => {
			ignore = true;
		};
	}, [request]);

	useEffect(() => {
		const handleScrapDeleted = (event: Event) => {
			const scrapId = (event as CustomEvent<{ id?: string }>).detail?.id;
			if (!scrapId) {
				return;
			}

			setScraps((current) => current.filter((scrap) => scrap.id !== scrapId));
			setRequest((current) => ({
				...current,
				reloadKey: current.reloadKey + 1,
			}));
		};

		window.addEventListener("scrap:deleted", handleScrapDeleted);
		return () =>
			window.removeEventListener("scrap:deleted", handleScrapDeleted);
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

		resetForm();
		if (request.page === 1) {
			setRequest((current) => ({
				...current,
				reloadKey: current.reloadKey + 1,
			}));
		} else {
			setRequest((current) => ({ ...current, page: 1 }));
		}
		setIsSaving(false);
	};

	const handlePageChange = (nextPage: number) => {
		if (
			nextPage === request.page ||
			nextPage < 1 ||
			nextPage > pagination.pageCount
		) {
			return;
		}

		setRequest((current) => ({ ...current, page: nextPage }));
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleSearchChange = (value: string) => {
		setRequest((current) => {
			if (current.search === value && current.page === 1) {
				return current;
			}

			return { ...current, search: value, page: 1 };
		});
	};

	const handleTitleChange = (value: string) => {
		setTitle(value);
		handleSearchChange(value);
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
		handleSearchChange("");
	};

	return (
		<div className="space-y-8">
			<section className="space-y-6">
				{isReadOnly ? null : (
					<ScrapComposer
						onSubmit={handleCreate}
						title={title}
						onTitleChange={handleTitleChange}
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
				{isReadOnly ? (
					<ScrapSearchInput
						value={request.search}
						onChange={handleSearchChange}
					/>
				) : null}

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
					<>
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{scraps.map((scrap, index) => (
								<ScrapCard
									key={scrap.id}
									scrap={scrap}
									loadImageEagerly={index < 3}
								/>
							))}
						</div>
						{pagination.pageCount > 1 ? (
							<ScrapPagination
								page={pagination.page}
								pageCount={pagination.pageCount}
								onPageChange={handlePageChange}
							/>
						) : null}
					</>
				) : (
					<div className="rounded-2xl border border-primary/40 border-dashed bg-primary/5 px-4 py-12 text-center">
						<p className="font-semibold text-foreground text-sm">
							{request.search
								? "検索に一致するスクラップはありません"
								: "まだスクラップはありません"}
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{request.search
								? "別のキーワードで検索してみてください。"
								: isReadOnly
									? "公開されているスクラップはありません。"
									: "短文、記事リンク、画像メモを残していきましょう。"}
						</p>
					</div>
				)}
			</section>
		</div>
	);
}

function ScrapSearchInput({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="rounded-3xl border border-border bg-background shadow-sm transition focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
			<Label htmlFor="scrap-search" className="sr-only">
				タイトル / URL / 検索
			</Label>
			<Input
				id="scrap-search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="検索"
				className="h-12 border-0 bg-transparent px-4 text-base shadow-none focus-visible:ring-0"
			/>
		</div>
	);
}

function ScrapPagination({
	page,
	pageCount,
	onPageChange,
}: {
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
}) {
	const pages = getVisiblePages(page, pageCount);
	const previousPage = page - 1;
	const nextPage = page + 1;

	return (
		<Pagination className="pt-2">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href="#"
						aria-disabled={page <= 1}
						tabIndex={page <= 1 ? -1 : undefined}
						className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
						onClick={(event) => {
							event.preventDefault();
							onPageChange(previousPage);
						}}
					/>
				</PaginationItem>

				{pages.map((item) =>
					typeof item === "string" ? (
						<PaginationItem key={item}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={item}>
							<PaginationLink
								href="#"
								isActive={item === page}
								onClick={(event) => {
									event.preventDefault();
									onPageChange(item);
								}}
							>
								{item}
							</PaginationLink>
						</PaginationItem>
					),
				)}

				<PaginationItem>
					<PaginationNext
						href="#"
						aria-disabled={page >= pageCount}
						tabIndex={page >= pageCount ? -1 : undefined}
						className={
							page >= pageCount ? "pointer-events-none opacity-50" : undefined
						}
						onClick={(event) => {
							event.preventDefault();
							onPageChange(nextPage);
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

function getVisiblePages(page: number, pageCount: number) {
	if (pageCount <= 7) {
		return Array.from({ length: pageCount }, (_, index) => index + 1);
	}

	const pages: Array<number | "start-ellipsis" | "end-ellipsis"> = [1];
	const start = Math.max(2, page - 1);
	const end = Math.min(pageCount - 1, page + 1);

	if (start > 2) {
		pages.push("start-ellipsis");
	}

	for (let currentPage = start; currentPage <= end; currentPage++) {
		pages.push(currentPage);
	}

	if (end < pageCount - 1) {
		pages.push("end-ellipsis");
	}

	pages.push(pageCount);
	return pages;
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
					タイトル / URL / 検索
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
					placeholder="タイトル、URLまたは検索"
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

function ScrapCard({
	scrap,
	loadImageEagerly,
}: {
	scrap: Scrap;
	loadImageEagerly: boolean;
}) {
	const Icon = kindIcons[scrap.kind];
	const heroImage =
		scrap.linkPreview?.imageUrl ?? scrap.attachments[0]?.url ?? null;

	return (
		<Link
			href={`/scraps/${scrap.id}`}
			className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
		</Link>
	);
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: unknown;
	} | null;
	if (typeof body?.error === "string") {
		return body.error;
	}
	if (
		typeof body?.error === "object" &&
		body.error !== null &&
		"message" in body.error &&
		typeof body.error.message === "string"
	) {
		return body.error.message;
	}

	return fallback;
}
