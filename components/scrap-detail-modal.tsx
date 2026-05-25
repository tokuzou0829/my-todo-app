"use client";

import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { dispatchScrapDeleted, ScrapDetail } from "@/components/scrap-detail";
import type { Scrap, ScrapResponse } from "@/components/scrap-types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { extractUuid } from "@/lib/uuid";

export function ScrapDetailModal({
	scrapId,
	currentUserId,
}: {
	scrapId?: string;
	currentUserId: string | null;
}) {
	const router = useRouter();
	const params = useParams<{ id?: string | string[] }>();
	const rawScrapId = scrapId ?? getSingleParam(params.id);
	const resolvedScrapId = rawScrapId ? extractUuid(rawScrapId) : null;
	const [scrap, setScrap] = useState<Scrap | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);
	const canDelete = scrap?.userId === currentUserId;

	useEffect(() => {
		let ignore = false;

		const loadScrap = async () => {
			if (!resolvedScrapId) {
				setError("スクラップの取得に失敗しました");
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError(null);

			const response = await apiClient.api.scraps[":id"].$get({
				param: { id: resolvedScrapId },
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
	}, [resolvedScrapId]);

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
		router.back();
		router.refresh();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && router.back()}>
			<DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-5xl">
				<div className="max-h-[calc(90vh-4.5rem)] overflow-y-auto overscroll-contain bg-background p-6">
					{scrap ? (
						<ScrapDetail scrap={scrap} isDialog />
					) : (
						<DialogHeader>
							<DialogTitle>スクラップ詳細</DialogTitle>
						</DialogHeader>
					)}
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
				</div>
				{canDelete ? (
					<DialogFooter className="shrink-0 border-border border-t bg-background p-4">
						<Button
							variant="outline"
							className="text-destructive hover:text-destructive"
							onClick={() => void handleDelete()}
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

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
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
