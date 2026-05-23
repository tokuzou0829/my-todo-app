"use client";

import { Clipboard, Loader2, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ApiKey = {
	id: string;
	name: string;
	keyPrefix: string;
	createdAt: string;
	lastUsedAt: string | null;
	revokedAt: string | null;
};

type ApiKeysResponse = {
	apiKeys: ApiKey[];
};

type CreatedApiKeyResponse = {
	apiKey: ApiKey;
	key: string;
};

export function ApiKeyManager() {
	const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
	const [name, setName] = useState("Default API key");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createError, setCreateError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;

		const loadApiKeys = async () => {
			setError(null);
			const response = await apiClient.api["api-keys"].$get();

			if (!response.ok) {
				if (!ignore) {
					setError(
						await getErrorMessage(response, "API Keyの取得に失敗しました"),
					);
					setIsLoading(false);
				}
				return;
			}

			const body = (await response.json()) as ApiKeysResponse;
			if (!ignore) {
				setApiKeys(body.apiKeys);
				setIsLoading(false);
			}
		};

		void loadApiKeys();

		return () => {
			ignore = true;
		};
	}, []);

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedName = name.trim();

		if (!trimmedName) {
			return;
		}

		setIsCreating(true);
		setCreateError(null);
		setCreatedKey(null);
		setCopied(false);
		const response = await apiClient.api["api-keys"].$post({
			json: { name: trimmedName },
		});

		if (!response.ok) {
			setCreateError(
				await getErrorMessage(response, "API Keyの発行に失敗しました"),
			);
			setIsCreating(false);
			return;
		}

		const body = (await response.json()) as CreatedApiKeyResponse;
		setApiKeys((current) => [body.apiKey, ...current]);
		setCreatedKey(body.key);
		setName("Default API key");
		setIsCreating(false);
	};

	const handleCopy = async () => {
		if (!createdKey) {
			return;
		}

		await navigator.clipboard.writeText(createdKey);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	};

	const handleRevoke = async (apiKey: ApiKey) => {
		setRevokingId(apiKey.id);
		setError(null);
		const response = await apiClient.api["api-keys"][":id"].$delete({
			param: { id: apiKey.id },
		});

		if (!response.ok) {
			setError(await getErrorMessage(response, "API Keyの失効に失敗しました"));
			setRevokingId(null);
			return;
		}

		setApiKeys((current) =>
			current.map((item) =>
				item.id === apiKey.id
					? { ...item, revokedAt: new Date().toISOString() }
					: item,
			),
		);
		setRevokingId(null);
	};

	const handleCreateDialogOpenChange = (open: boolean) => {
		setIsCreateDialogOpen(open);

		if (!open) {
			setCreatedKey(null);
			setCopied(false);
			setCreateError(null);
			setName("Default API key");
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">API Key</h1>
					<p className="max-w-2xl text-muted-foreground">
						API Keyを発行すると、本人の Todo
						とサブスクリプションを外部クライアントから読み書きできます。
					</p>
				</div>
				<Dialog
					open={isCreateDialogOpen}
					onOpenChange={handleCreateDialogOpenChange}
				>
					<DialogTrigger asChild>
						<Button className="shrink-0 sm:mt-1">API Keyを発行する</Button>
					</DialogTrigger>
					<DialogContent>
						{createdKey ? (
							<>
								<DialogHeader>
									<DialogTitle>API Keyを発行しました</DialogTitle>
									<DialogDescription>
										この値は再表示できません。必要な場所に保存してください。
									</DialogDescription>
								</DialogHeader>
								<code className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 font-mono text-xs">
									{createdKey}
								</code>
								<DialogFooter>
									<DialogClose asChild>
										<Button variant="outline">閉じる</Button>
									</DialogClose>
									<Button onClick={handleCopy}>
										<Clipboard className="size-4" />
										{copied ? "コピー済み" : "コピー"}
									</Button>
								</DialogFooter>
							</>
						) : (
							<>
								<DialogHeader>
									<DialogTitle>新しい API Key</DialogTitle>
									<DialogDescription>
										発行したキーは本人の Todo
										とサブスクリプションを読み書きできます。
									</DialogDescription>
								</DialogHeader>
								<form className="space-y-4" onSubmit={handleCreate}>
									<div className="grid gap-2">
										<Label htmlFor="api-key-name">名前</Label>
										<Input
											id="api-key-name"
											value={name}
											maxLength={80}
											onChange={(event) => setName(event.target.value)}
										/>
									</div>
									{createError ? (
										<p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
											{createError}
										</p>
									) : null}
									<DialogFooter>
										<DialogClose asChild>
											<Button type="button" variant="outline">
												キャンセル
											</Button>
										</DialogClose>
										<Button type="submit" disabled={isCreating}>
											{isCreating ? (
												<Loader2 className="size-4 animate-spin" />
											) : null}
											発行する
										</Button>
									</DialogFooter>
								</form>
							</>
						)}
					</DialogContent>
				</Dialog>
			</div>

			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="font-semibold text-xl tracking-tight">
						発行済み API Key
					</h2>
					<p className="text-muted-foreground text-sm">
						失効したキーは API 認証に使用できません。
					</p>
				</div>
				<div>
					{error ? (
						<p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
							{error}
						</p>
					) : null}
					{isLoading ? (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Loader2 className="size-4 animate-spin" />
							読み込み中...
						</div>
					) : apiKeys.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							まだ API Keyはありません。
						</p>
					) : (
						<div className="divide-y divide-border rounded-xl border">
							{apiKeys.map((apiKey) => {
								const isRevoked = Boolean(apiKey.revokedAt);
								return (
									<div
										key={apiKey.id}
										className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-medium">{apiKey.name}</p>
												<Badge variant={isRevoked ? "outline" : "secondary"}>
													{isRevoked ? "失効済み" : "有効"}
												</Badge>
											</div>
											<p className="font-mono text-muted-foreground text-xs">
												{apiKey.keyPrefix}...
											</p>
											<p className="text-muted-foreground text-xs">
												作成: {formatDate(apiKey.createdAt)} / 最終利用:{" "}
												{formatDate(apiKey.lastUsedAt)}
											</p>
										</div>
										<Button
											variant="outline"
											className={cn(isRevoked && "hidden")}
											disabled={revokingId === apiKey.id}
											onClick={() => void handleRevoke(apiKey)}
										>
											{revokingId === apiKey.id ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Trash2 className="size-4" />
											)}
											失効
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function formatDate(value: string | null) {
	if (!value) {
		return "未使用";
	}

	return new Intl.DateTimeFormat("ja-JP", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;

	return body?.error ?? fallback;
}
