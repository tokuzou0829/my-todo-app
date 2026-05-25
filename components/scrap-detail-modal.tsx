"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { dispatchScrapDeleted, ScrapDetail } from "@/components/scrap-detail";
import type { Scrap } from "@/components/scrap-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";

export function ScrapDetailModal({
	scrap,
	currentUserId,
}: {
	scrap: Scrap;
	currentUserId: string | null;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const canDelete = scrap.userId === currentUserId;

	const handleDelete = async () => {
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
					<ScrapDetail scrap={scrap} isDialog />
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
