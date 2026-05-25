"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { dispatchScrapDeleted, ScrapDetail } from "@/components/scrap-detail";
import type { Scrap, ScrapResponse } from "@/components/scrap-types";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export function ScrapDetailPage({
	scrapId,
	currentUserId,
}: {
	scrapId: string;
	currentUserId: string | null;
}) {
	const router = useRouter();
	const [scrap, setScrap] = useState<Scrap | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);
	const canDelete = scrap?.userId === currentUserId;

	useEffect(() => {
		let ignore = false;

		const loadScrap = async () => {
			setIsLoading(true);
			setError(null);

			const response = await apiClient.api.scraps[":id"].$get({
				param: { id: scrapId },
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

			const json = (await response.json()) as ScrapResponse;
			if (!ignore) {
				setScrap(json.scrap);
				setIsLoading(false);
			}
		};

		void loadScrap();

		return () => {
			ignore = true;
		};
	}, [scrapId]);

	const handleDelete = async () => {
		if (!scrap) {
			return;
		}

		setIsDeleting(true);
		setError(null);

		const response = await apiClient.api.scraps[":id"].$delete({
			param: { id: scrap.id },
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(response, "スクラップの削除に失敗しました"),
			);
			setIsDeleting(false);
			return;
		}

		dispatchScrapDeleted(scrap.id);
		router.push("/scraps");
		router.refresh();
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button asChild variant="outline">
					<Link href="/scraps">一覧へ戻る</Link>
				</Button>
				{canDelete ? (
					<Button
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={() => void handleDelete()}
						disabled={isDeleting}
					>
						<Trash2 className="size-4" />
						{isDeleting ? "削除中..." : "削除"}
					</Button>
				) : null}
			</div>

			{isLoading ? (
				<p className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
					スクラップを読み込んでいます...
				</p>
			) : null}
			{error ? (
				<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
					{error}
				</p>
			) : null}
			{scrap ? (
				<article className="mx-auto w-full max-w-5xl py-2 sm:py-4">
					<ScrapDetail scrap={scrap} />
				</article>
			) : null}
		</div>
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
