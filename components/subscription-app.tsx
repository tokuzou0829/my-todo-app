"use client";

import { CalendarClock, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import {
	type Dispatch,
	type FormEvent,
	type SetStateAction,
	useEffect,
	useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Currency = "JPY";
type BillingIntervalUnit = "week" | "month" | "year";
type LabelColor = "lime" | "blue" | "violet" | "rose" | "amber" | "slate";

type SubscriptionLabel = {
	id: string;
	userId: string;
	name: string;
	color: LabelColor;
	createdAt: string;
	updatedAt: string;
};

type NewLabel = {
	name: string;
	color: LabelColor;
};

type LabelDialogTarget = "create" | "edit";

type Subscription = {
	id: string;
	userId: string;
	name: string;
	amountMinor: number;
	currency: Currency;
	billingIntervalUnit: BillingIntervalUnit;
	billingIntervalCount: number;
	nextPaymentAt: string;
	memo: string | null;
	labels: SubscriptionLabel[];
	createdAt: string;
	updatedAt: string;
};

type SubscriptionPayload = {
	name: string;
	amountMinor: number;
	currency: Currency;
	billingIntervalUnit: BillingIntervalUnit;
	billingIntervalCount: number;
	nextPaymentAt: string;
	memo: string | null;
	labelIds: string[];
	newLabels: NewLabel[];
};

type SubscriptionResponse = {
	subscription: Subscription;
};

type SubscriptionsResponse = {
	subscriptions: Subscription[];
	labels: SubscriptionLabel[];
};

type SubscriptionFormState = {
	name: string;
	amount: string;
	currency: Currency;
	billingIntervalUnit: BillingIntervalUnit;
	billingIntervalCount: string;
	nextPaymentDate: string;
	memo: string;
	labelIds: string[];
	newLabels: NewLabel[];
};

const currencyOptions: Record<
	Currency,
	{ code: Currency; label: string; minorUnit: number }
> = {
	JPY: {
		code: "JPY",
		label: "日本円 (JPY)",
		minorUnit: 0,
	},
};

const billingIntervalUnitOptions: Array<{
	value: BillingIntervalUnit;
	label: string;
}> = [
	{ value: "week", label: "週" },
	{ value: "month", label: "月" },
	{ value: "year", label: "年" },
];

const labelColorOptions: Array<{ value: LabelColor; label: string }> = [
	{ value: "lime", label: "ライム" },
	{ value: "blue", label: "ブルー" },
	{ value: "violet", label: "バイオレット" },
	{ value: "rose", label: "ローズ" },
	{ value: "amber", label: "アンバー" },
	{ value: "slate", label: "スレート" },
];

const labelColorClassNames: Record<LabelColor, string> = {
	lime: "border-lime-300 bg-lime-100 text-lime-900",
	blue: "border-blue-300 bg-blue-100 text-blue-900",
	violet: "border-violet-300 bg-violet-100 text-violet-900",
	rose: "border-rose-300 bg-rose-100 text-rose-900",
	amber: "border-amber-300 bg-amber-100 text-amber-900",
	slate: "border-slate-300 bg-slate-100 text-slate-900",
};

const selectedLabelColorClassNames: Record<LabelColor, string> = {
	lime: "border-lime-500 bg-lime-200 text-lime-950",
	blue: "border-blue-500 bg-blue-200 text-blue-950",
	violet: "border-violet-500 bg-violet-200 text-violet-950",
	rose: "border-rose-500 bg-rose-200 text-rose-950",
	amber: "border-amber-500 bg-amber-200 text-amber-950",
	slate: "border-slate-500 bg-slate-200 text-slate-950",
};

const emptyForm: SubscriptionFormState = {
	name: "",
	amount: "",
	currency: "JPY",
	billingIntervalUnit: "month",
	billingIntervalCount: "1",
	nextPaymentDate: "",
	memo: "",
	labelIds: [],
	newLabels: [],
};

export function SubscriptionApp() {
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
	const [labels, setLabels] = useState<SubscriptionLabel[]>([]);
	const [form, setForm] = useState<SubscriptionFormState>(emptyForm);
	const [draft, setDraft] = useState<SubscriptionFormState>(emptyForm);
	const [selectedFilterLabelIds, setSelectedFilterLabelIds] = useState<
		string[]
	>([]);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [labelDialogTarget, setLabelDialogTarget] =
		useState<LabelDialogTarget | null>(null);
	const [newLabelName, setNewLabelName] = useState("");
	const [newLabelColor, setNewLabelColor] = useState<LabelColor>("lime");
	const [selectedSubscription, setSelectedSubscription] =
		useState<Subscription | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let ignore = false;

		const loadSubscriptions = async () => {
			setError(null);
			const response = await apiClient.api.subscriptions.$get();

			if (!response.ok) {
				if (!ignore) {
					setError(
						await getErrorMessage(
							response,
							"サブスクリプションの取得に失敗しました",
						),
					);
					setIsLoading(false);
				}
				return;
			}

			const body = (await response.json()) as SubscriptionsResponse;
			if (!ignore) {
				setSubscriptions(sortSubscriptions(body.subscriptions));
				setLabels(sortLabels(body.labels));
				setIsLoading(false);
			}
		};

		void loadSubscriptions();

		return () => {
			ignore = true;
		};
	}, []);

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const payload = toPayload(form);

		if (!payload) {
			setError("サブスクリプション名、金額、次回支払い日を入力してください");
			return;
		}

		setIsCreating(true);
		setError(null);
		const response = await apiClient.api.subscriptions.$post({
			json: payload,
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(
					response,
					"サブスクリプションの追加に失敗しました",
				),
			);
			setIsCreating(false);
			return;
		}

		const body = (await response.json()) as SubscriptionResponse;
		setSubscriptions((current) =>
			sortSubscriptions([body.subscription, ...current]),
		);
		setLabels((current) => mergeLabels(current, body.subscription.labels));
		setForm(emptyForm);
		setIsCreateDialogOpen(false);
		setIsCreating(false);
	};

	const openCreate = () => {
		setForm(emptyForm);
		setIsCreateDialogOpen(true);
	};

	const closeCreate = () => {
		if (!isCreating) {
			setIsCreateDialogOpen(false);
			if (labelDialogTarget === "create") {
				closeLabelDialog();
			}
		}
	};

	const openLabelDialog = (target: LabelDialogTarget) => {
		setLabelDialogTarget(target);
		setNewLabelName("");
		setNewLabelColor("lime");
	};

	const closeLabelDialog = () => {
		setLabelDialogTarget(null);
	};

	const handleAddLabel = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = newLabelName.trim();

		if (!labelDialogTarget || !name || isLabelNameUnavailable(name)) {
			return;
		}

		const setTargetForm = labelDialogTarget === "create" ? setForm : setDraft;
		setTargetForm((current) => ({
			...current,
			newLabels: [...current.newLabels, { name, color: newLabelColor }],
		}));
		closeLabelDialog();
	};

	const isLabelNameUnavailable = (name: string) => {
		const trimmedName = name.trim();
		const targetForm = labelDialogTarget === "edit" ? draft : form;

		return (
			!trimmedName ||
			labels.some((label) => label.name === trimmedName) ||
			targetForm.newLabels.some((label) => label.name === trimmedName)
		);
	};

	const openEdit = (subscription: Subscription) => {
		setSelectedSubscription(subscription);
		setDraft(toFormState(subscription));
	};

	const closeEdit = () => {
		if (!isSaving) {
			setSelectedSubscription(null);
			if (labelDialogTarget === "edit") {
				closeLabelDialog();
			}
		}
	};

	const saveSubscription = async () => {
		if (!selectedSubscription) {
			return;
		}

		const payload = toPayload(draft);

		if (!payload) {
			setError("サブスクリプション名、金額、次回支払い日を入力してください");
			return;
		}

		setIsSaving(true);
		setError(null);
		const response = await apiClient.api.subscriptions[":id"].$patch({
			param: { id: selectedSubscription.id },
			json: payload,
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(
					response,
					"サブスクリプションの更新に失敗しました",
				),
			);
			setIsSaving(false);
			return;
		}

		const body = (await response.json()) as SubscriptionResponse;
		setSubscriptions((current) =>
			sortSubscriptions(
				current.map((item) =>
					item.id === body.subscription.id ? body.subscription : item,
				),
			),
		);
		setLabels((current) => mergeLabels(current, body.subscription.labels));
		setSelectedSubscription(null);
		setIsSaving(false);
	};

	const deleteSubscription = async (subscription: Subscription) => {
		setSubscriptions((current) =>
			current.filter((item) => item.id !== subscription.id),
		);
		setError(null);

		const response = await apiClient.api.subscriptions[":id"].$delete({
			param: { id: subscription.id },
		});

		if (!response.ok) {
			setSubscriptions((current) =>
				sortSubscriptions([subscription, ...current]),
			);
			setError(
				await getErrorMessage(
					response,
					"サブスクリプションの削除に失敗しました",
				),
			);
		}
	};

	const filteredSubscriptions = filterSubscriptionsByLabels(
		subscriptions,
		selectedFilterLabelIds,
	);
	const summary = summarizeSubscriptions(filteredSubscriptions);

	return (
		<div className="space-y-10">
			<section className="space-y-8">
				<div className="flex flex-col gap-4 border-border border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-1">
						<h2 className="font-semibold text-2xl text-foreground tracking-tight">
							サブスクリプション
						</h2>
						<p className="text-muted-foreground text-sm">
							登録している継続課金の支払い予定と年間コストを確認します。
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className="gap-2 px-3 py-1 text-muted-foreground"
						>
							<CreditCard className="size-3" />
							JPY 固定
						</Badge>
						<Button onClick={openCreate}>
							<Plus className="size-4" />
							追加
						</Button>
					</div>
				</div>

				<div className="rounded-[2rem] border border-border bg-muted/40 p-6 sm:p-8">
					<div className="space-y-3">
						<p className="font-medium text-muted-foreground text-sm">
							今月の支払い金額
						</p>
						<p className="font-semibold text-5xl text-foreground tracking-tight sm:text-6xl">
							{formatMoney(summary.thisMonthTotal, "JPY")}
						</p>
						<p className="text-muted-foreground text-sm">
							{formatMonthLabel(new Date())}
							に次回支払いがあるサブスクリプションの合計です。
						</p>
					</div>

					<div className="mt-8 grid gap-0 border-border border-t pt-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
						<SummaryItem
							label="次回支払い"
							value={
								summary.nextSubscription
									? formatDate(summary.nextSubscription.nextPaymentAt)
									: "未登録"
							}
							description={summary.nextSubscription?.name ?? "予定はありません"}
						/>
						<SummaryItem
							label="次回支払い合計"
							value={formatMoney(summary.nextPaymentTotal, "JPY")}
							description="登録済みの次回請求額"
						/>
						<SummaryItem
							label="月換算"
							value={formatMoney(summary.monthlyTotal, "JPY")}
							description="支払い周期を月額に換算"
						/>
						<SummaryItem
							label="年間合計"
							value={formatMoney(summary.annualTotal, "JPY")}
							description="1年あたりの見込み支出"
						/>
					</div>
				</div>

				{labels.length ? (
					<div className="space-y-3">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<h3 className="font-semibold text-foreground text-sm">
								ラベルで絞り込み
							</h3>
							{selectedFilterLabelIds.length ? (
								<Button
									variant="ghost"
									size="sm"
									className="justify-start text-muted-foreground"
									onClick={() => setSelectedFilterLabelIds([])}
								>
									フィルタをクリア
								</Button>
							) : null}
						</div>
						<div className="flex flex-wrap gap-2">
							{labels.map((label) => {
								const isSelected = selectedFilterLabelIds.includes(label.id);

								return (
									<button
										key={label.id}
										type="button"
										className={cn(
											"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
											isSelected
												? selectedLabelColorClassNames[label.color]
												: labelColorClassNames[label.color],
										)}
										onClick={() =>
											setSelectedFilterLabelIds((current) =>
												current.includes(label.id)
													? current.filter((id) => id !== label.id)
													: [...current, label.id],
											)
										}
									>
										{label.name}
									</button>
								);
							})}
						</div>
					</div>
				) : null}

				{error ? (
					<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
						{error}
					</p>
				) : null}

				{isLoading ? (
					<p className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
						サブスクリプションを読み込んでいます...
					</p>
				) : filteredSubscriptions.length ? (
					<div className="space-y-3">
						<h3 className="font-semibold text-foreground text-lg">
							支払い予定
						</h3>
						<div className="divide-y divide-border border-border border-y">
							{filteredSubscriptions.map((subscription) => (
								<SubscriptionRow
									key={subscription.id}
									subscription={subscription}
									onEdit={openEdit}
									onDelete={(item) => void deleteSubscription(item)}
								/>
							))}
						</div>
					</div>
				) : subscriptions.length ? (
					<div className="rounded-2xl border border-border border-dashed px-4 py-10 text-center">
						<p className="font-semibold text-foreground text-sm">
							条件に一致するサブスクリプションはありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							ラベルフィルタを変更すると、サマリーと一覧に反映されます。
						</p>
					</div>
				) : (
					<div className="rounded-2xl border border-primary/40 border-dashed bg-primary/5 px-4 py-10 text-center">
						<p className="font-semibold text-foreground text-sm">
							まだサブスクリプションはありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							継続課金を追加して、月額と年間コストを見える化しましょう。
						</p>
					</div>
				)}
			</section>

			<Dialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => !open && closeCreate()}
			>
				<DialogContent>
					<form onSubmit={handleCreate} className="space-y-5">
						<DialogHeader>
							<DialogTitle>サブスクリプションを追加</DialogTitle>
							<DialogDescription>
								金額は JPY
								で保存します。通貨情報は将来拡張できるように保持します。
							</DialogDescription>
						</DialogHeader>
						<SubscriptionFields
							form={form}
							setForm={setForm}
							labels={labels}
							onOpenNewLabel={() => openLabelDialog("create")}
							idPrefix="create"
						/>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={closeCreate}
								disabled={isCreating}
							>
								キャンセル
							</Button>
							<Button type="submit" disabled={isCreating || !canSubmit(form)}>
								{isCreating ? "追加中..." : "追加"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={selectedSubscription !== null}
				onOpenChange={(open) => !open && closeEdit()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>サブスクリプションを編集</DialogTitle>
						<DialogDescription>
							次回支払い日、金額、支払い周期を更新できます。
						</DialogDescription>
					</DialogHeader>
					<SubscriptionFields
						form={draft}
						setForm={setDraft}
						labels={labels}
						onOpenNewLabel={() => openLabelDialog("edit")}
						idPrefix="edit"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={closeEdit} disabled={isSaving}>
							キャンセル
						</Button>
						<Button
							onClick={() => void saveSubscription()}
							disabled={isSaving || !canSubmit(draft)}
						>
							{isSaving ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={labelDialogTarget !== null}
				onOpenChange={(open) => !open && closeLabelDialog()}
			>
				<DialogContent>
					<form onSubmit={handleAddLabel} className="space-y-5">
						<DialogHeader>
							<DialogTitle>ラベルを追加</DialogTitle>
							<DialogDescription>
								サブスクリプションを分類するための色付きラベルを作成します。
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="new-subscription-label-name">ラベル名</Label>
								<Input
									id="new-subscription-label-name"
									value={newLabelName}
									onChange={(event) => setNewLabelName(event.target.value)}
									placeholder="例: 仕事"
								/>
								{isLabelNameUnavailable(newLabelName) && newLabelName.trim() ? (
									<p className="text-destructive text-xs">
										同じ名前のラベルがすでにあります。
									</p>
								) : null}
							</div>
							<div className="space-y-2">
								<Label>色</Label>
								<div className="flex flex-wrap gap-2">
									{labelColorOptions.map((option) => {
										const isSelected = newLabelColor === option.value;

										return (
											<button
												key={option.value}
												type="button"
												className={cn(
													"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
													isSelected
														? selectedLabelColorClassNames[option.value]
														: labelColorClassNames[option.value],
												)}
												onClick={() => setNewLabelColor(option.value)}
											>
												{option.label}
											</button>
										);
									})}
								</div>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={closeLabelDialog}>
								キャンセル
							</Button>
							<Button
								type="submit"
								disabled={isLabelNameUnavailable(newLabelName)}
							>
								追加
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function SummaryItem({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description: string;
}) {
	return (
		<div className="min-w-0 py-3 sm:px-5 sm:first:pl-0 sm:last:pr-0">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="mt-1 truncate font-semibold text-foreground text-lg">
				{value}
			</p>
			<p className="mt-1 truncate text-muted-foreground text-xs">
				{description}
			</p>
		</div>
	);
}

function SubscriptionRow({
	subscription,
	onEdit,
	onDelete,
}: {
	subscription: Subscription;
	onEdit: (subscription: Subscription) => void;
	onDelete: (subscription: Subscription) => void;
}) {
	const annualAmount = getAnnualAmount(subscription);
	const monthlyAmount = annualAmount / 12;
	const isDueSoon = isWithinDays(subscription.nextPaymentAt, 7);

	return (
		<div
			className={cn(
				"grid gap-4 border-l-2 border-l-transparent px-3 py-5 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4",
				isDueSoon && "border-l-primary bg-primary/5",
			)}
		>
			<div className="min-w-0 space-y-2">
				<p className="truncate font-semibold text-foreground text-lg">
					{subscription.name}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={isDueSoon ? "default" : "outline"}>
						<CalendarClock className="size-3" />
						{formatDate(subscription.nextPaymentAt)}
					</Badge>
					<Badge variant="secondary">
						{formatBillingInterval(subscription)}
					</Badge>
					{subscription.labels.map((label) => (
						<LabelChip key={label.id} label={label} />
					))}
				</div>
				{subscription.memo ? (
					<p className="text-muted-foreground text-sm">{subscription.memo}</p>
				) : null}
			</div>
			<div className="flex items-start gap-1 sm:justify-end">
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-foreground"
					onClick={() => onEdit(subscription)}
					aria-label={`${subscription.name} を編集する`}
				>
					<Pencil className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-destructive"
					onClick={() => onDelete(subscription)}
					aria-label={`${subscription.name} を削除する`}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
			<dl className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
				<DetailItem
					label="次回支払い"
					value={formatMoney(subscription.amountMinor, subscription.currency)}
				/>
				<DetailItem
					label="月換算"
					value={formatMoney(monthlyAmount, subscription.currency)}
				/>
				<DetailItem
					label="年間"
					value={formatMoney(annualAmount, subscription.currency)}
				/>
			</dl>
		</div>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-1 font-semibold text-foreground text-sm">{value}</dd>
		</div>
	);
}

function LabelChip({ label }: { label: SubscriptionLabel | NewLabel }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs",
				labelColorClassNames[label.color],
			)}
		>
			{label.name}
		</span>
	);
}

function SubscriptionFields({
	form,
	setForm,
	labels,
	onOpenNewLabel,
	idPrefix,
}: {
	form: SubscriptionFormState;
	setForm: Dispatch<SetStateAction<SubscriptionFormState>>;
	labels: SubscriptionLabel[];
	onOpenNewLabel: () => void;
	idPrefix: string;
}) {
	return (
		<div className="space-y-4">
			<div className="grid gap-2">
				<Label htmlFor={`${idPrefix}-subscription-name`}>サービス名</Label>
				<Input
					id={`${idPrefix}-subscription-name`}
					value={form.name}
					onChange={(event) =>
						setForm((current) => ({ ...current, name: event.target.value }))
					}
				/>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-subscription-amount`}>金額</Label>
					<Input
						id={`${idPrefix}-subscription-amount`}
						type="number"
						min="0"
						step="1"
						value={form.amount}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								amount: event.target.value,
							}))
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-subscription-next-payment`}>
						次回支払い日
					</Label>
					<Input
						id={`${idPrefix}-subscription-next-payment`}
						type="date"
						value={form.nextPaymentDate}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								nextPaymentDate: event.target.value,
							}))
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`${idPrefix}-subscription-cycle`}>支払い周期</Label>
				<div className="grid grid-cols-[6rem_1fr] gap-2">
					<Input
						id={`${idPrefix}-subscription-cycle`}
						type="number"
						min="1"
						step="1"
						value={form.billingIntervalCount}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								billingIntervalCount: event.target.value,
							}))
						}
					/>
					<Select
						value={form.billingIntervalUnit}
						onValueChange={(value) =>
							setForm((current) => ({
								...current,
								billingIntervalUnit: value as BillingIntervalUnit,
							}))
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{billingIntervalUnitOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`${idPrefix}-subscription-memo`}>メモ</Label>
				<Input
					id={`${idPrefix}-subscription-memo`}
					value={form.memo}
					onChange={(event) =>
						setForm((current) => ({ ...current, memo: event.target.value }))
					}
				/>
			</div>
			<div className="space-y-3 rounded-xl border border-border p-3">
				<div className="space-y-2">
					<Label>ラベル</Label>
					{labels.length ? (
						<div className="flex flex-wrap gap-2">
							{labels.map((label) => {
								const isSelected = form.labelIds.includes(label.id);

								return (
									<button
										key={label.id}
										type="button"
										className={cn(
											"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
											isSelected
												? selectedLabelColorClassNames[label.color]
												: labelColorClassNames[label.color],
										)}
										onClick={() =>
											setForm((current) => ({
												...current,
												labelIds: current.labelIds.includes(label.id)
													? current.labelIds.filter((id) => id !== label.id)
													: [...current.labelIds, label.id],
											}))
										}
									>
										{label.name}
									</button>
								);
							})}
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							まだラベルはありません。下から作成できます。
						</p>
					)}
				</div>
				{form.newLabels.length ? (
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs">今回追加するラベル</p>
						<div className="flex flex-wrap gap-2">
							{form.newLabels.map((label) => (
								<button
									key={label.name}
									type="button"
									className={cn(
										"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
										selectedLabelColorClassNames[label.color],
									)}
									onClick={() =>
										setForm((current) => ({
											...current,
											newLabels: current.newLabels.filter(
												(item) => item.name !== label.name,
											),
										}))
									}
								>
									{label.name} を外す
								</button>
							))}
						</div>
					</div>
				) : null}
				<div className="border-border border-t pt-3">
					<Button variant="outline" size="sm" onClick={onOpenNewLabel}>
						<Plus className="size-4" />
						新しいラベルを作成
					</Button>
				</div>
			</div>
		</div>
	);
}

function summarizeSubscriptions(subscriptions: Subscription[]) {
	const now = new Date();
	const thisMonthTotal = subscriptions.reduce((total, subscription) => {
		return isSameMonth(subscription.nextPaymentAt, now)
			? total + subscription.amountMinor
			: total;
	}, 0);
	const nextPaymentTotal = subscriptions.reduce(
		(total, subscription) => total + subscription.amountMinor,
		0,
	);
	const annualTotal = subscriptions.reduce(
		(total, subscription) => total + getAnnualAmount(subscription),
		0,
	);

	return {
		nextSubscription: subscriptions[0] ?? null,
		thisMonthTotal,
		nextPaymentTotal,
		monthlyTotal: annualTotal / 12,
		annualTotal,
	};
}

function filterSubscriptionsByLabels(
	subscriptions: Subscription[],
	selectedLabelIds: string[],
) {
	if (selectedLabelIds.length === 0) {
		return subscriptions;
	}

	const selectedLabelIdSet = new Set(selectedLabelIds);
	return subscriptions.filter((subscription) =>
		subscription.labels.some((label) => selectedLabelIdSet.has(label.id)),
	);
}

function mergeLabels(
	currentLabels: SubscriptionLabel[],
	nextLabels: SubscriptionLabel[],
) {
	const labelsById = new Map(currentLabels.map((label) => [label.id, label]));

	for (const label of nextLabels) {
		labelsById.set(label.id, label);
	}

	return sortLabels(Array.from(labelsById.values()));
}

function sortLabels(labels: SubscriptionLabel[]) {
	return [...labels].sort((left, right) =>
		left.name.localeCompare(right.name, "ja"),
	);
}

function toPayload(form: SubscriptionFormState): SubscriptionPayload | null {
	const name = form.name.trim();
	const amountMinor = parseAmountMinor(form.amount, form.currency);
	const billingIntervalCount = Number.parseInt(form.billingIntervalCount, 10);
	const nextPaymentAt = toPaymentIsoString(form.nextPaymentDate);

	if (
		!name ||
		amountMinor === null ||
		!Number.isInteger(billingIntervalCount) ||
		billingIntervalCount < 1 ||
		!nextPaymentAt
	) {
		return null;
	}

	return {
		name,
		amountMinor,
		currency: form.currency,
		billingIntervalUnit: form.billingIntervalUnit,
		billingIntervalCount,
		nextPaymentAt,
		memo: form.memo.trim() || null,
		labelIds: form.labelIds,
		newLabels: form.newLabels,
	};
}

function toFormState(subscription: Subscription): SubscriptionFormState {
	return {
		name: subscription.name,
		amount: formatAmountInput(subscription.amountMinor, subscription.currency),
		currency: subscription.currency,
		billingIntervalUnit: subscription.billingIntervalUnit,
		billingIntervalCount: String(subscription.billingIntervalCount),
		nextPaymentDate: toDateInputValue(subscription.nextPaymentAt),
		memo: subscription.memo ?? "",
		labelIds: subscription.labels.map((label) => label.id),
		newLabels: [],
	};
}

function canSubmit(form: SubscriptionFormState) {
	return Boolean(
		form.name.trim() &&
			form.amount.trim() &&
			form.billingIntervalCount.trim() &&
			form.nextPaymentDate,
	);
}

function parseAmountMinor(value: string, currency: Currency) {
	const amount = Number(value);
	const { minorUnit } = currencyOptions[currency];

	if (!Number.isFinite(amount) || amount < 0) {
		return null;
	}

	return Math.round(amount * 10 ** minorUnit);
}

function formatAmountInput(amountMinor: number, currency: Currency) {
	const { minorUnit } = currencyOptions[currency];
	return String(amountMinor / 10 ** minorUnit);
}

function getAnnualAmount(subscription: Subscription) {
	const paymentsPerYear = getPaymentsPerYear(
		subscription.billingIntervalUnit,
		subscription.billingIntervalCount,
	);
	return subscription.amountMinor * paymentsPerYear;
}

function getPaymentsPerYear(unit: BillingIntervalUnit, count: number) {
	if (unit === "week") {
		return 52 / count;
	}

	if (unit === "month") {
		return 12 / count;
	}

	return 1 / count;
}

function formatBillingInterval(subscription: Subscription) {
	const option = billingIntervalUnitOptions.find(
		(item) => item.value === subscription.billingIntervalUnit,
	);
	const unitLabel = option?.label ?? "回";

	if (subscription.billingIntervalCount === 1) {
		return `毎${unitLabel}`;
	}

	return `${subscription.billingIntervalCount}${unitLabel}ごと`;
}

function sortSubscriptions(subscriptions: Subscription[]) {
	return [...subscriptions].sort((left, right) => {
		const nextPaymentDiff =
			new Date(left.nextPaymentAt).getTime() -
			new Date(right.nextPaymentAt).getTime();

		if (nextPaymentDiff !== 0) {
			return nextPaymentDiff;
		}

		return left.name.localeCompare(right.name, "ja");
	});
}

function toPaymentIsoString(value: string) {
	if (!value) {
		return null;
	}

	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date.toISOString();
}

function toDateInputValue(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const localDate = new Date(
		date.getTime() - date.getTimezoneOffset() * 60_000,
	);
	return localDate.toISOString().slice(0, 10);
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "日付未設定";
	}

	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	}).format(date);
}

function formatMonthLabel(date: Date) {
	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
	}).format(date);
}

function formatMoney(amountMinor: number, currency: Currency) {
	const { minorUnit } = currencyOptions[currency];
	return new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency,
		maximumFractionDigits: minorUnit,
	}).format(amountMinor / 10 ** minorUnit);
}

function isSameMonth(value: string, baseDate: Date) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return false;
	}

	return (
		date.getFullYear() === baseDate.getFullYear() &&
		date.getMonth() === baseDate.getMonth()
	);
}

function isWithinDays(value: string, days: number) {
	const date = new Date(value).getTime();
	if (Number.isNaN(date)) {
		return false;
	}

	const diff = date - Date.now();
	return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? fallback;
}
