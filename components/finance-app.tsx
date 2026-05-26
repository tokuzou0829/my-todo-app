"use client";

import {
	ChevronLeft,
	ChevronRight,
	Lock,
	Pencil,
	Plus,
	SlidersHorizontal,
	Tags,
	Trash2,
} from "lucide-react";
import {
	type Dispatch,
	type FormEvent,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useState,
} from "react";
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

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
type EntryType = "expense" | "income";
type PaymentMethod =
	| "cash"
	| "credit_card"
	| "bank_transfer"
	| "e_money"
	| "other";
type TagColor = "lime" | "blue" | "violet" | "rose" | "amber" | "slate";
type GroupBy = "week" | "month" | "year";
type TypeFilter = "all" | EntryType;
type PeriodPreset = "week" | "month" | "year" | "all";

type FinanceTag = {
	id: string;
	userId: string;
	name: string;
	color: TagColor;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
};

type FinanceEntry = {
	id: string;
	userId: string;
	type: EntryType;
	title: string;
	amountMinor: number;
	currency: Currency;
	occurredAt: string;
	paymentMethod: PaymentMethod;
	merchant: string | null;
	memo: string | null;
	isPrivate: boolean;
	createdAt: string;
	updatedAt: string;
	tags: FinanceTag[];
};

type FinanceResponse = {
	entries: FinanceEntry[];
	tags: FinanceTag[];
	owner: { id: string; name: string } | null;
	isReadOnly: boolean;
};

type EntryResponse = {
	entry: FinanceEntry;
};

type TagResponse = {
	tag: FinanceTag;
};

type EntryFormState = {
	type: EntryType;
	title: string;
	amount: string;
	occurredDate: string;
	paymentMethod: PaymentMethod;
	merchant: string;
	memo: string;
	isPrivate: boolean;
	tagIds: string[];
};

type TagEditState = {
	name: string;
	color: TagColor;
};

type ChartPoint = {
	period: string;
	income: number;
	expense: number;
	net: number;
};

const emptyForm: EntryFormState = {
	type: "expense",
	title: "",
	amount: "",
	occurredDate: toDateInputValue(new Date().toISOString()),
	paymentMethod: "credit_card",
	merchant: "",
	memo: "",
	isPrivate: false,
	tagIds: [],
};

const tagColorOptions: Array<{ value: TagColor; label: string }> = [
	{ value: "lime", label: "ライム" },
	{ value: "blue", label: "ブルー" },
	{ value: "violet", label: "バイオレット" },
	{ value: "rose", label: "ローズ" },
	{ value: "amber", label: "アンバー" },
	{ value: "slate", label: "スレート" },
];

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
	{ value: "cash", label: "現金" },
	{ value: "credit_card", label: "クレジットカード" },
	{ value: "bank_transfer", label: "銀行振込" },
	{ value: "e_money", label: "電子マネー" },
	{ value: "other", label: "その他" },
];

const groupByOptions: Array<{ value: GroupBy; label: string }> = [
	{ value: "week", label: "週ごと" },
	{ value: "month", label: "月ごと" },
	{ value: "year", label: "年ごと" },
];

const tagColorClassNames: Record<TagColor, string> = {
	lime: "border-lime-300 bg-lime-100 text-lime-900",
	blue: "border-blue-300 bg-blue-100 text-blue-900",
	violet: "border-violet-300 bg-violet-100 text-violet-900",
	rose: "border-rose-300 bg-rose-100 text-rose-900",
	amber: "border-amber-300 bg-amber-100 text-amber-900",
	slate: "border-slate-300 bg-slate-100 text-slate-900",
};

const selectedTagColorClassNames: Record<TagColor, string> = {
	lime: "border-lime-500 bg-lime-200 text-lime-950",
	blue: "border-blue-500 bg-blue-200 text-blue-950",
	violet: "border-violet-500 bg-violet-200 text-violet-950",
	rose: "border-rose-500 bg-rose-200 text-rose-950",
	amber: "border-amber-500 bg-amber-200 text-amber-950",
	slate: "border-slate-500 bg-slate-200 text-slate-950",
};

const entryDialogContentClassName =
	"flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(90vh,42rem)] sm:max-w-2xl";

const entryDialogHeaderClassName =
	"px-4 pt-5 pr-12 pb-3 text-left sm:px-6 sm:pt-6";

const entryDialogBodyClassName =
	"min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6";

const entryDialogFooterClassName =
	"border-border border-t bg-background px-4 py-3 sm:px-6 sm:py-4";

export function FinanceApp({ isReadOnly = false }: { isReadOnly?: boolean }) {
	const [entries, setEntries] = useState<FinanceEntry[]>([]);
	const [tags, setTags] = useState<FinanceTag[]>([]);
	const [form, setForm] = useState<EntryFormState>(emptyForm);
	const [draft, setDraft] = useState<EntryFormState>(emptyForm);
	const [selectedEntry, setSelectedEntry] = useState<FinanceEntry | null>(null);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const [groupBy, setGroupBy] = useState<GroupBy>("month");
	const [displayMonth, setDisplayMonth] = useState(() =>
		startOfMonth(new Date()),
	);
	const [periodFrom, setPeriodFrom] = useState(() =>
		toDateInputValue(startOfMonth(new Date()).toISOString()),
	);
	const [periodTo, setPeriodTo] = useState(() =>
		toDateInputValue(endOfMonth(new Date()).toISOString()),
	);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isPeriodFilterActive, setIsPeriodFilterActive] = useState(false);
	const [draftPeriodFrom, setDraftPeriodFrom] = useState(periodFrom);
	const [draftPeriodTo, setDraftPeriodTo] = useState(periodTo);
	const [draftGroupBy, setDraftGroupBy] = useState<GroupBy>(groupBy);
	const [draftSelectedTagIds, setDraftSelectedTagIds] = useState<string[]>([]);
	const [draftIsPeriodFilterActive, setDraftIsPeriodFilterActive] =
		useState(false);
	const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState<TagColor>("lime");
	const [tagEdits, setTagEdits] = useState<Record<string, TagEditState>>({});
	const [ownerName, setOwnerName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let ignore = false;

		const loadFinance = async () => {
			setError(null);
			const response = await apiClient.api.finance.$get();

			if (!response.ok) {
				if (!ignore) {
					setError(
						await getErrorMessage(response, "家計簿の取得に失敗しました"),
					);
					setIsLoading(false);
				}
				return;
			}

			const body = (await response.json()) as FinanceResponse;
			if (!ignore) {
				setEntries(sortEntries(body.entries));
				setTags(sortTags(body.tags));
				setOwnerName(body.owner?.name ?? null);
				setTagEdits(createTagEditState(body.tags));
				setIsLoading(false);
			}
		};

		void loadFinance();

		return () => {
			ignore = true;
		};
	}, []);

	const displayMonthRange = getMonthRange(displayMonth);
	const activePeriod = isPeriodFilterActive
		? { from: periodFrom, to: periodTo }
		: displayMonthRange;
	const filteredEntries = filterEntries(
		entries,
		selectedTagIds,
		typeFilter,
		activePeriod,
	);
	const summary = summarizeEntries(filteredEntries);
	const chartData = createChartData(filteredEntries, groupBy);
	const monthlyEntryGroups = groupEntriesByMonth(filteredEntries);
	const draftActivePeriodPreset = getActivePeriodPreset(
		draftPeriodFrom,
		draftPeriodTo,
	);
	const hasActiveFilters =
		isPeriodFilterActive ||
		selectedTagIds.length > 0 ||
		typeFilter !== "all" ||
		groupBy !== "month";

	const moveDisplayMonth = (monthDiff: number) => {
		setDisplayMonth((current) => {
			const nextMonth = addMonths(current, monthDiff);
			const range = getMonthRange(nextMonth);
			setPeriodFrom(range.from);
			setPeriodTo(range.to);
			return nextMonth;
		});
		setIsPeriodFilterActive(false);
	};

	const closeFilter = () => {
		setIsFilterOpen(false);
	};

	const openFilter = () => {
		setDraftPeriodFrom(periodFrom);
		setDraftPeriodTo(periodTo);
		setDraftGroupBy(groupBy);
		setDraftSelectedTagIds(selectedTagIds);
		setDraftIsPeriodFilterActive(isPeriodFilterActive);
		setIsFilterOpen(true);
	};

	const applyDraftFilters = () => {
		setPeriodFrom(draftPeriodFrom);
		setPeriodTo(draftPeriodTo);
		setGroupBy(draftGroupBy);
		setSelectedTagIds(draftSelectedTagIds);
		setIsPeriodFilterActive(draftIsPeriodFilterActive);
		if (!draftIsPeriodFilterActive) {
			const nextDisplayMonth = draftPeriodFrom
				? new Date(`${draftPeriodFrom}T00:00:00`)
				: new Date();
			setDisplayMonth(startOfMonth(nextDisplayMonth));
		}
		setIsFilterOpen(false);
	};

	const applyDraftPeriodPreset = (preset: PeriodPreset) => {
		const range = getPeriodPresetRange(preset);
		setDraftPeriodFrom(range.from);
		setDraftPeriodTo(range.to);
		setDraftIsPeriodFilterActive(preset !== "month");
	};

	const resetDraftFilters = () => {
		const range = getPeriodPresetRange("month");
		setDraftPeriodFrom(range.from);
		setDraftPeriodTo(range.to);
		setDraftGroupBy("month");
		setDraftSelectedTagIds([]);
		setDraftIsPeriodFilterActive(false);
	};

	const openCreate = () => {
		setForm({
			...emptyForm,
			occurredDate: toDateInputValue(new Date().toISOString()),
		});
		setIsCreateOpen(true);
	};

	const closeCreate = () => {
		if (!isSaving) {
			setIsCreateOpen(false);
		}
	};

	const openEdit = (entry: FinanceEntry) => {
		setSelectedEntry(entry);
		setDraft(toFormState(entry));
	};

	const closeEdit = () => {
		if (!isSaving) {
			setSelectedEntry(null);
		}
	};

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const payload = toPayload(form);

		if (!payload) {
			setError("タイトル、金額、発生日を入力してください");
			return;
		}

		setIsSaving(true);
		setError(null);
		const response = await apiClient.api.finance.entries.$post({
			json: payload,
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(response, "家計簿項目の追加に失敗しました"),
			);
			setIsSaving(false);
			return;
		}

		const body = (await response.json()) as EntryResponse;
		setEntries((current) => sortEntries([body.entry, ...current]));
		setTags((current) => mergeTags(current, body.entry.tags));
		setForm(emptyForm);
		setIsCreateOpen(false);
		setIsSaving(false);
	};

	const saveEntry = async () => {
		if (!selectedEntry) {
			return;
		}

		const payload = toPayload(draft);
		if (!payload) {
			setError("タイトル、金額、発生日を入力してください");
			return;
		}

		setIsSaving(true);
		setError(null);
		const response = await apiClient.api.finance.entries[":id"].$patch({
			param: { id: selectedEntry.id },
			json: payload,
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(response, "家計簿項目の更新に失敗しました"),
			);
			setIsSaving(false);
			return;
		}

		const body = (await response.json()) as EntryResponse;
		setEntries((current) =>
			sortEntries(
				current.map((entry) =>
					entry.id === body.entry.id ? body.entry : entry,
				),
			),
		);
		setTags((current) => mergeTags(current, body.entry.tags));
		setSelectedEntry(null);
		setIsSaving(false);
	};

	const deleteEntry = async (entry: FinanceEntry) => {
		setEntries((current) => current.filter((item) => item.id !== entry.id));
		setError(null);

		const response = await apiClient.api.finance.entries[":id"].$delete({
			param: { id: entry.id },
		});

		if (!response.ok) {
			setEntries((current) => sortEntries([entry, ...current]));
			setError(
				await getErrorMessage(response, "家計簿項目の削除に失敗しました"),
			);
		}
	};

	const createTag = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = newTagName.trim();
		if (!name || tags.some((tag) => tag.name === name)) {
			return;
		}

		setError(null);
		const response = await apiClient.api.finance.tags.$post({
			json: { name, color: newTagColor },
		});

		if (!response.ok) {
			setError(await getErrorMessage(response, "タグの作成に失敗しました"));
			return;
		}

		const body = (await response.json()) as TagResponse;
		setTags((current) => sortTags([...current, body.tag]));
		setTagEdits((current) => ({
			...current,
			[body.tag.id]: { name: body.tag.name, color: body.tag.color },
		}));
		setNewTagName("");
		setNewTagColor("lime");
	};

	const saveTag = async (tag: FinanceTag) => {
		const edit = tagEdits[tag.id];
		if (!edit || !edit.name.trim()) {
			return;
		}

		setError(null);
		const response = await apiClient.api.finance.tags[":id"].$patch({
			param: { id: tag.id },
			json: { name: edit.name.trim(), color: edit.color },
		});

		if (!response.ok) {
			setError(await getErrorMessage(response, "タグの更新に失敗しました"));
			return;
		}

		const body = (await response.json()) as TagResponse;
		setTags((current) =>
			sortTags(
				current.map((item) => (item.id === body.tag.id ? body.tag : item)),
			),
		);
		setEntries((current) =>
			current.map((entry) => ({
				...entry,
				tags: entry.tags.map((item) =>
					item.id === body.tag.id ? body.tag : item,
				),
			})),
		);
	};

	const deleteTag = async (tag: FinanceTag) => {
		setError(null);
		const response = await apiClient.api.finance.tags[":id"].$delete({
			param: { id: tag.id },
		});

		if (!response.ok) {
			setError(await getErrorMessage(response, "タグの削除に失敗しました"));
			return;
		}

		setTags((current) => current.filter((item) => item.id !== tag.id));
		setSelectedTagIds((current) => current.filter((id) => id !== tag.id));
		setEntries((current) =>
			current.map((entry) => ({
				...entry,
				tags: entry.tags.filter((item) => item.id !== tag.id),
			})),
		);
	};

	return (
		<div className="space-y-10">
			<section className="space-y-8">
				<div className="flex flex-col gap-4 border-border border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-1">
						<h2 className="font-semibold text-2xl text-foreground tracking-tight">
							家計簿
						</h2>
						<p className="text-muted-foreground text-sm">
							{ownerName && isReadOnly
								? `${ownerName} さんの公開家計簿を表示しています。`
								: "支払いと収入をタグで整理し、収益推移を分析します。"}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{isReadOnly ? null : (
							<>
								<Button
									variant="outline"
									onClick={() => setIsTagManagerOpen(true)}
								>
									<Tags className="size-4" />
									タグ管理
								</Button>
								<Button onClick={openCreate}>
									<Plus className="size-4" />
									追加
								</Button>
							</>
						)}
					</div>
				</div>

				<div className="space-y-6 border-border border-b pb-6">
					<div className="space-y-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
							<div className="inline-flex items-center justify-center gap-2 md:justify-start">
								<Button
									variant="ghost"
									size="icon"
									className="size-10 text-muted-foreground"
									onClick={() => moveDisplayMonth(-1)}
									aria-label="前の月を表示する"
									disabled={isPeriodFilterActive}
								>
									<ChevronLeft className="size-5" />
								</Button>
								<span className="min-w-40 text-center font-semibold text-2xl text-foreground tracking-tight">
									{isPeriodFilterActive
										? formatPeriodRange(periodFrom, periodTo)
										: formatDisplayMonth(displayMonth)}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="size-10 text-muted-foreground"
									onClick={() => moveDisplayMonth(1)}
									aria-label="次の月を表示する"
									disabled={isPeriodFilterActive}
								>
									<ChevronRight className="size-5" />
								</Button>
								<span className="text-muted-foreground text-xs">
									{filteredEntries.length} 件
								</span>
							</div>

							<div className="w-full md:w-auto">
								<div className="flex gap-2">
									<div className="grid flex-1 grid-cols-3 rounded-xl border border-border p-1 md:w-64">
										{[
											{ value: "all", label: "すべて" },
											{ value: "expense", label: "支出" },
											{ value: "income", label: "収入" },
										].map((option) => (
											<button
												key={option.value}
												type="button"
												className={cn(
													"rounded-lg px-2 py-1.5 font-medium text-xs transition",
													typeFilter === option.value
														? "bg-primary/15 text-foreground"
														: "text-muted-foreground hover:bg-muted",
												)}
												onClick={() =>
													setTypeFilter(option.value as TypeFilter)
												}
											>
												{option.label}
											</button>
										))}
									</div>
									<Button
										variant="outline"
										size="icon"
										className="relative size-10"
										onClick={openFilter}
										aria-label="詳細フィルタを開く"
									>
										<SlidersHorizontal className="size-4" />
										{hasActiveFilters ? (
											<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
										) : null}
									</Button>
								</div>
							</div>
						</div>
					</div>
					<div className="grid gap-0 border-border border-t pt-5 sm:grid-cols-3 sm:divide-x sm:divide-border">
						<FinanceSummaryMetric
							label="収入"
							value={formatMoney(summary.income, "JPY")}
							tone="income"
						/>
						<FinanceSummaryMetric
							label="支出"
							value={formatMoney(summary.expense, "JPY")}
							tone="expense"
						/>
						<FinanceSummaryMetric
							label="純利益"
							value={formatMoney(summary.net, "JPY")}
							tone={summary.net >= 0 ? "netPositive" : "netNegative"}
						/>
					</div>
					<div className="h-72 min-w-0 border-border border-t pt-6 sm:h-80">
						{chartData.length ? (
							<FinanceChart data={chartData} />
						) : (
							<EmptyChart />
						)}
					</div>
				</div>

				{error ? (
					<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
						{error}
					</p>
				) : null}

				{isLoading ? (
					<p className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
						家計簿を読み込んでいます...
					</p>
				) : filteredEntries.length ? (
					<div className="space-y-3">
						<h3 className="font-semibold text-foreground text-lg">明細</h3>
						<div className="space-y-8">
							{monthlyEntryGroups.map((group) => (
								<section key={group.month} className="space-y-3">
									<div className="flex items-end justify-between gap-3 border-border border-b pb-2">
										<h4 className="font-semibold text-foreground text-sm">
											{formatMonthHeading(group.month)}
										</h4>
										<p className="text-muted-foreground text-xs">
											{group.entries.length} 件
										</p>
									</div>
									<div className="divide-y divide-border border-border border-y">
										{group.entries.map((entry) => (
											<FinanceEntryRow
												key={entry.id}
												entry={entry}
												onEdit={isReadOnly ? undefined : openEdit}
												onDelete={
													isReadOnly
														? undefined
														: (item) => void deleteEntry(item)
												}
											/>
										))}
									</div>
								</section>
							))}
						</div>
					</div>
				) : entries.length ? (
					<div className="rounded-2xl border border-border border-dashed px-4 py-10 text-center">
						<p className="font-semibold text-foreground text-sm">
							条件に一致する明細はありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							タグまたは種別フィルタを変更してください。
						</p>
					</div>
				) : (
					<div className="rounded-2xl border border-primary/40 border-dashed bg-primary/5 px-4 py-10 text-center">
						<p className="font-semibold text-foreground text-sm">
							まだ家計簿項目はありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{isReadOnly
								? "公開されている家計簿項目はありません。"
								: "最初の支払いまたは収入を追加しましょう。"}
						</p>
					</div>
				)}
			</section>

			<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>詳細フィルタ</DialogTitle>
						<DialogDescription>
							期間、グラフ粒度、タグを必要なときだけ調整します。
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-6">
						<div className="space-y-3">
							<FilterLabel>期間</FilterLabel>
							<div className="flex flex-wrap gap-2">
								{[
									{ value: "week", label: "今週" },
									{ value: "month", label: "今月" },
									{ value: "year", label: "今年" },
									{ value: "all", label: "全期間" },
								].map((option) => {
									const isActive = draftActivePeriodPreset === option.value;

									return (
										<button
											key={option.value}
											type="button"
											className={cn(
												"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
												isActive
													? "border-primary/50 bg-primary/15 text-foreground"
													: "border-border bg-background text-muted-foreground",
											)}
											onClick={() =>
												applyDraftPeriodPreset(option.value as PeriodPreset)
											}
										>
											{option.label}
										</button>
									);
								})}
							</div>
							<div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
								<Input
									type="date"
									value={draftPeriodFrom}
									onChange={(event) => {
										setDraftPeriodFrom(event.target.value);
										setDraftIsPeriodFilterActive(true);
									}}
									aria-label="集計開始日"
								/>
								<span className="hidden text-center text-muted-foreground text-sm sm:block">
									から
								</span>
								<Input
									type="date"
									value={draftPeriodTo}
									onChange={(event) => {
										setDraftPeriodTo(event.target.value);
										setDraftIsPeriodFilterActive(true);
									}}
									aria-label="集計終了日"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<FilterLabel>グラフ</FilterLabel>
							<Select
								value={draftGroupBy}
								onValueChange={(value) => setDraftGroupBy(value as GroupBy)}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{groupByOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{tags.length ? (
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3">
									<FilterLabel>タグ</FilterLabel>
									{draftSelectedTagIds.length ? (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-muted-foreground"
											onClick={() => setDraftSelectedTagIds([])}
										>
											タグをクリア
										</Button>
									) : null}
								</div>
								<div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
									{tags.map((tag) => {
										const isSelected = draftSelectedTagIds.includes(tag.id);

										return (
											<button
												key={tag.id}
												type="button"
												className={cn(
													"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
													isSelected
														? selectedTagColorClassNames[tag.color]
														: tagColorClassNames[tag.color],
												)}
												onClick={() =>
													setDraftSelectedTagIds((current) =>
														current.includes(tag.id)
															? current.filter((id) => id !== tag.id)
															: [...current, tag.id],
													)
												}
											>
												{tag.name}
											</button>
										);
									})}
								</div>
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeFilter}>
							キャンセル
						</Button>
						<Button variant="outline" onClick={resetDraftFilters}>
							リセット
						</Button>
						<Button onClick={applyDraftFilters}>適用</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isCreateOpen}
				onOpenChange={(open) => !open && closeCreate()}
			>
				<DialogContent className={entryDialogContentClassName}>
					<form onSubmit={handleCreate} className="flex min-h-0 flex-col">
						<DialogHeader className={entryDialogHeaderClassName}>
							<DialogTitle>家計簿項目を追加</DialogTitle>
							<DialogDescription>
								支払いまたは収入をタグ付きで記録します。
							</DialogDescription>
						</DialogHeader>
						<div className={entryDialogBodyClassName}>
							<EntryFields
								form={form}
								setForm={setForm}
								tags={tags}
								idPrefix="create"
							/>
						</div>
						<DialogFooter className={entryDialogFooterClassName}>
							<Button
								variant="outline"
								onClick={closeCreate}
								disabled={isSaving}
							>
								キャンセル
							</Button>
							<Button type="submit" disabled={isSaving || !canSubmit(form)}>
								{isSaving ? "追加中..." : "追加"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={selectedEntry !== null}
				onOpenChange={(open) => !open && closeEdit()}
			>
				<DialogContent className={entryDialogContentClassName}>
					<DialogHeader className={entryDialogHeaderClassName}>
						<DialogTitle>家計簿項目を編集</DialogTitle>
						<DialogDescription>
							金額、発生日、タグ、非公開設定を更新できます。
						</DialogDescription>
					</DialogHeader>
					<div className={entryDialogBodyClassName}>
						<EntryFields
							form={draft}
							setForm={setDraft}
							tags={tags}
							idPrefix="edit"
						/>
					</div>
					<DialogFooter className={entryDialogFooterClassName}>
						<Button variant="outline" onClick={closeEdit} disabled={isSaving}>
							キャンセル
						</Button>
						<Button
							onClick={() => void saveEntry()}
							disabled={isSaving || !canSubmit(draft)}
						>
							{isSaving ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>タグ管理</DialogTitle>
						<DialogDescription>
							デフォルトタグを確認し、カスタムタグを作成・編集します。
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={createTag}
						className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_10rem_auto]"
					>
						<Input
							value={newTagName}
							onChange={(event) => setNewTagName(event.target.value)}
							placeholder="例: 旅行"
							aria-label="新しいタグ名"
						/>
						<Select
							value={newTagColor}
							onValueChange={(value) => setNewTagColor(value as TagColor)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{tagColorOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button type="submit" disabled={!newTagName.trim()}>
							作成
						</Button>
					</form>
					<div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
						{tags.map((tag) => (
							<TagManagerRow
								key={tag.id}
								tag={tag}
								edit={tagEdits[tag.id] ?? { name: tag.name, color: tag.color }}
								onEditChange={(nextEdit) =>
									setTagEdits((current) => ({ ...current, [tag.id]: nextEdit }))
								}
								onSave={() => void saveTag(tag)}
								onDelete={() => void deleteTag(tag)}
							/>
						))}
					</div>
					<DialogFooter>
						<Button onClick={() => setIsTagManagerOpen(false)}>閉じる</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function FinanceSummaryMetric({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: "income" | "expense" | "netPositive" | "netNegative";
}) {
	const toneClassName = {
		income: "text-lime-700",
		expense: "text-rose-700",
		netPositive: "text-foreground",
		netNegative: "text-amber-700",
	}[tone];

	return (
		<div className="min-w-0 py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
			<p className="font-medium text-muted-foreground text-xs tracking-wide">
				{label}
			</p>
			<p
				className={cn(
					"mt-2 font-semibold text-3xl tracking-tight",
					toneClassName,
				)}
			>
				{value}
			</p>
		</div>
	);
}

function FilterLabel({ children }: { children: ReactNode }) {
	return (
		<p className="font-medium text-muted-foreground text-xs tracking-wide">
			{children}
		</p>
	);
}

function FinanceChart({ data }: { data: ChartPoint[] }) {
	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
			minWidth={0}
			initialDimension={{ width: 1, height: 1 }}
		>
			<ComposedChart
				data={data}
				margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
				<XAxis
					dataKey="period"
					tickLine={false}
					axisLine={false}
					fontSize={12}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					fontSize={12}
					tickFormatter={(value) => compactMoney(Number(value))}
				/>
				<Tooltip
					formatter={(value, name) => [
						formatMoney(Number(value), "JPY"),
						chartLabel(String(name)),
					]}
					labelFormatter={(label) => `期間: ${label}`}
				/>
				<Legend formatter={(value) => chartLabel(String(value))} />
				<Bar dataKey="expense" fill="#fb7185" radius={[6, 6, 0, 0]} />
				<Area
					type="monotone"
					dataKey="income"
					fill="#bef264"
					fillOpacity={0.35}
					stroke="#65a30d"
					strokeWidth={2}
				/>
				<Line
					type="monotone"
					dataKey="net"
					stroke="#84cc16"
					strokeWidth={3}
					dot={{ r: 3 }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}

function EmptyChart() {
	return (
		<div className="grid h-full place-items-center border-border border-y border-dashed text-center">
			<div>
				<p className="font-semibold text-foreground text-sm">
					グラフ化できるデータがありません
				</p>
				<p className="mt-1 text-muted-foreground text-sm">
					明細を追加すると収益推移が表示されます。
				</p>
			</div>
		</div>
	);
}

function FinanceEntryRow({
	entry,
	onEdit,
	onDelete,
}: {
	entry: FinanceEntry;
	onEdit?: (entry: FinanceEntry) => void;
	onDelete?: (entry: FinanceEntry) => void;
}) {
	const isExpense = entry.type === "expense";
	const isMaskedPrivate =
		entry.isPrivate && entry.title === `非公開の${isExpense ? "支出" : "収入"}`;

	return (
		<div
			className={cn(
				"grid gap-4 border-l-2 px-3 py-5 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4",
				isExpense ? "border-l-rose-300" : "border-l-primary",
			)}
		>
			<div className="min-w-0 space-y-2">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<p className="truncate font-semibold text-foreground text-lg">
						{entry.title}
					</p>
					{entry.isPrivate ? (
						<Badge variant="secondary">
							<Lock className="size-3" />
							非公開
						</Badge>
					) : null}
					<Badge variant={isExpense ? "destructive" : "default"}>
						{isExpense ? "支出" : "収入"}
					</Badge>
				</div>
				{isMaskedPrivate ? null : (
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{formatDate(entry.occurredAt)}</Badge>
						<Badge variant="secondary">
							{paymentMethodLabel(entry.paymentMethod)}
						</Badge>
						{entry.tags.map((tag) => (
							<TagChip key={tag.id} tag={tag} />
						))}
					</div>
				)}
				{!isMaskedPrivate && (entry.merchant || entry.memo) ? (
					<p className="text-muted-foreground text-sm">
						{[entry.merchant, entry.memo].filter(Boolean).join(" / ")}
					</p>
				) : null}
			</div>
			<div className="flex items-start justify-between gap-3 sm:justify-end">
				<p
					className={cn(
						"font-semibold text-2xl tracking-tight",
						isExpense ? "text-rose-700" : "text-primary-foreground",
					)}
				>
					{isExpense ? "-" : "+"}
					{formatMoney(entry.amountMinor, entry.currency)}
				</p>
				{onEdit && onDelete ? (
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground hover:text-foreground"
							onClick={() => onEdit(entry)}
							aria-label={`${entry.title} を編集する`}
						>
							<Pencil className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground hover:text-destructive"
							onClick={() => onDelete(entry)}
							aria-label={`${entry.title} を削除する`}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

function EntryFields({
	form,
	setForm,
	tags,
	idPrefix,
}: {
	form: EntryFormState;
	setForm: Dispatch<SetStateAction<EntryFormState>>;
	tags: FinanceTag[];
	idPrefix: string;
}) {
	return (
		<div className="space-y-3 sm:space-y-4">
			<div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
				<Checkbox
					id={`${idPrefix}-finance-private`}
					checked={form.isPrivate}
					onCheckedChange={(checked) =>
						setForm((current) => ({ ...current, isPrivate: checked === true }))
					}
					className="mt-0.5"
				/>
				<Label
					htmlFor={`${idPrefix}-finance-private`}
					className="block font-normal"
				>
					<span className="block font-medium text-foreground">
						非公開にする
					</span>
					<span className="block text-muted-foreground text-xs">
						未ログインの公開表示から除外されます。
					</span>
				</Label>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-type`}>種別</Label>
					<Select
						value={form.type}
						onValueChange={(value) =>
							setForm((current) => ({ ...current, type: value as EntryType }))
						}
					>
						<SelectTrigger id={`${idPrefix}-finance-type`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="expense">支出</SelectItem>
							<SelectItem value="income">収入</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-date`}>発生日</Label>
					<Input
						id={`${idPrefix}-finance-date`}
						type="date"
						className="mobile-date-input"
						value={form.occurredDate}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								occurredDate: event.target.value,
							}))
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`${idPrefix}-finance-title`}>項目名</Label>
				<Input
					id={`${idPrefix}-finance-title`}
					value={form.title}
					onChange={(event) =>
						setForm((current) => ({ ...current, title: event.target.value }))
					}
					placeholder="例: スーパーで買い物"
				/>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-amount`}>金額</Label>
					<Input
						id={`${idPrefix}-finance-amount`}
						type="number"
						min="0"
						step="1"
						value={form.amount}
						onChange={(event) =>
							setForm((current) => ({ ...current, amount: event.target.value }))
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-payment-method`}>
						支払い方法
					</Label>
					<Select
						value={form.paymentMethod}
						onValueChange={(value) =>
							setForm((current) => ({
								...current,
								paymentMethod: value as PaymentMethod,
							}))
						}
					>
						<SelectTrigger id={`${idPrefix}-finance-payment-method`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{paymentMethodOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-merchant`}>支払先・入金元</Label>
					<Input
						id={`${idPrefix}-finance-merchant`}
						value={form.merchant}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								merchant: event.target.value,
							}))
						}
						placeholder="例: 駅前スーパー"
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${idPrefix}-finance-memo`}>メモ</Label>
					<Input
						id={`${idPrefix}-finance-memo`}
						value={form.memo}
						onChange={(event) =>
							setForm((current) => ({ ...current, memo: event.target.value }))
						}
					/>
				</div>
			</div>
			<div className="space-y-3 rounded-xl border border-border p-3">
				<Label>タグ</Label>
				<div className="flex flex-wrap gap-2">
					{tags.map((tag) => {
						const isSelected = form.tagIds.includes(tag.id);

						return (
							<button
								key={tag.id}
								type="button"
								className={cn(
									"rounded-full border px-3 py-1 font-medium text-xs transition hover:opacity-85",
									isSelected
										? selectedTagColorClassNames[tag.color]
										: tagColorClassNames[tag.color],
								)}
								onClick={() =>
									setForm((current) => ({
										...current,
										tagIds: current.tagIds.includes(tag.id)
											? current.tagIds.filter((id) => id !== tag.id)
											: [...current.tagIds, tag.id],
									}))
								}
							>
								{tag.name}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function TagManagerRow({
	tag,
	edit,
	onEditChange,
	onSave,
	onDelete,
}: {
	tag: FinanceTag;
	edit: TagEditState;
	onEditChange: (edit: TagEditState) => void;
	onSave: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-center">
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<TagChip tag={tag} />
					{tag.isDefault ? <Badge variant="outline">デフォルト</Badge> : null}
				</div>
				<Input
					value={edit.name}
					onChange={(event) =>
						onEditChange({ ...edit, name: event.target.value })
					}
					disabled={tag.isDefault}
					aria-label={`${tag.name} のタグ名`}
				/>
			</div>
			<Select
				value={edit.color}
				onValueChange={(value) =>
					onEditChange({ ...edit, color: value as TagColor })
				}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{tagColorOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="flex gap-1 sm:justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={onSave}
					disabled={!edit.name.trim()}
				>
					保存
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-destructive"
					onClick={onDelete}
					disabled={tag.isDefault}
					aria-label={`${tag.name} を削除する`}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</div>
	);
}

function TagChip({ tag }: { tag: FinanceTag }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs",
				tagColorClassNames[tag.color],
			)}
		>
			{tag.name}
		</span>
	);
}

function filterEntries(
	entries: FinanceEntry[],
	tagIds: string[],
	typeFilter: TypeFilter,
	period: { from: string; to: string },
) {
	const selectedTagIds = new Set(tagIds);
	const fromTime = period.from
		? new Date(`${period.from}T00:00:00`).getTime()
		: Number.NEGATIVE_INFINITY;
	const toTime = period.to
		? new Date(`${period.to}T23:59:59.999`).getTime()
		: Number.POSITIVE_INFINITY;

	return entries.filter((entry) => {
		const occurredAt = new Date(entry.occurredAt).getTime();
		const matchesType = typeFilter === "all" || entry.type === typeFilter;
		const matchesTags =
			selectedTagIds.size === 0 ||
			entry.tags.some((tag) => selectedTagIds.has(tag.id));
		const matchesPeriod =
			!Number.isNaN(occurredAt) &&
			occurredAt >= fromTime &&
			occurredAt <= toTime;

		return matchesType && matchesTags && matchesPeriod;
	});
}

function groupEntriesByMonth(entries: FinanceEntry[]) {
	const groups = new Map<string, FinanceEntry[]>();

	for (const entry of entries) {
		const month = getBucketKey(entry.occurredAt, "month");
		groups.set(month, [...(groups.get(month) ?? []), entry]);
	}

	return Array.from(groups.entries())
		.sort(([left], [right]) => right.localeCompare(left))
		.map(([month, groupEntries]) => ({
			month,
			entries: sortEntries(groupEntries),
		}));
}

function summarizeEntries(entries: FinanceEntry[]) {
	const income = entries.reduce(
		(total, entry) => total + (entry.type === "income" ? entry.amountMinor : 0),
		0,
	);
	const expense = entries.reduce(
		(total, entry) =>
			total + (entry.type === "expense" ? entry.amountMinor : 0),
		0,
	);

	return { income, expense, net: income - expense };
}

function createChartData(entries: FinanceEntry[], groupBy: GroupBy) {
	const buckets = new Map<string, { income: number; expense: number }>();

	for (const entry of entries) {
		const key = getBucketKey(entry.occurredAt, groupBy);
		const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
		if (entry.type === "income") {
			bucket.income += entry.amountMinor;
		} else {
			bucket.expense += entry.amountMinor;
		}
		buckets.set(key, bucket);
	}

	return Array.from(buckets.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([period, value]) => ({
			period,
			income: value.income,
			expense: value.expense,
			net: value.income - value.expense,
		}));
}

function toPayload(form: EntryFormState) {
	const title = form.title.trim();
	const amountMinor = Number.parseInt(form.amount, 10);
	const occurredAt = toIsoDate(form.occurredDate);

	if (
		!title ||
		!Number.isInteger(amountMinor) ||
		amountMinor < 0 ||
		!occurredAt
	) {
		return null;
	}

	return {
		type: form.type,
		title,
		amountMinor,
		currency: "JPY" as const,
		occurredAt,
		paymentMethod: form.paymentMethod,
		merchant: form.merchant.trim() || null,
		memo: form.memo.trim() || null,
		isPrivate: form.isPrivate,
		tagIds: form.tagIds,
		newTags: [],
	};
}

function toFormState(entry: FinanceEntry): EntryFormState {
	return {
		type: entry.type,
		title: entry.title,
		amount: String(entry.amountMinor),
		occurredDate: toDateInputValue(entry.occurredAt),
		paymentMethod: entry.paymentMethod,
		merchant: entry.merchant ?? "",
		memo: entry.memo ?? "",
		isPrivate: entry.isPrivate,
		tagIds: entry.tags.map((tag) => tag.id),
	};
}

function canSubmit(form: EntryFormState) {
	return Boolean(form.title.trim() && form.amount.trim() && form.occurredDate);
}

function mergeTags(currentTags: FinanceTag[], nextTags: FinanceTag[]) {
	const tagsById = new Map(currentTags.map((tag) => [tag.id, tag]));
	for (const tag of nextTags) {
		tagsById.set(tag.id, tag);
	}
	return sortTags(Array.from(tagsById.values()));
}

function createTagEditState(tags: FinanceTag[]) {
	return Object.fromEntries(
		tags.map((tag) => [
			tag.id,
			{ name: tag.name, color: tag.color } satisfies TagEditState,
		]),
	);
}

function sortEntries(entries: FinanceEntry[]) {
	return [...entries].sort(
		(left, right) =>
			new Date(right.occurredAt).getTime() -
			new Date(left.occurredAt).getTime(),
	);
}

function sortTags(tags: FinanceTag[]) {
	return [...tags].sort(
		(left, right) =>
			Number(right.isDefault) - Number(left.isDefault) ||
			left.name.localeCompare(right.name, "ja"),
	);
}

function getPeriodPresetRange(preset: PeriodPreset) {
	const now = new Date();

	if (preset === "week") {
		return {
			from: toDateInputValue(startOfWeek(now).toISOString()),
			to: toDateInputValue(endOfWeek(now).toISOString()),
		};
	}

	if (preset === "month") {
		return {
			from: toDateInputValue(startOfMonth(now).toISOString()),
			to: toDateInputValue(endOfMonth(now).toISOString()),
		};
	}

	if (preset === "year") {
		return {
			from: toDateInputValue(startOfYear(now).toISOString()),
			to: toDateInputValue(endOfYear(now).toISOString()),
		};
	}

	return { from: "", to: "" };
}

function getActivePeriodPreset(
	from: string,
	to: string,
): PeriodPreset | "custom" {
	for (const preset of ["week", "month", "year", "all"] as const) {
		const range = getPeriodPresetRange(preset);
		if (range.from === from && range.to === to) {
			return preset;
		}
	}

	return "custom";
}

function formatPeriodRange(from: string, to: string) {
	if (!from && !to) {
		return "全期間";
	}

	if (from && to) {
		return `${formatShortDate(from)} - ${formatShortDate(to)}`;
	}

	if (from) {
		return `${formatShortDate(from)} 以降`;
	}

	return `${formatShortDate(to)} まで`;
}

function formatShortDate(value: string) {
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("ja-JP", {
		month: "numeric",
		day: "numeric",
	}).format(date);
}

function startOfWeek(date: Date) {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	result.setDate(result.getDate() - result.getDay());
	return result;
}

function endOfWeek(date: Date) {
	const result = startOfWeek(date);
	result.setDate(result.getDate() + 6);
	result.setHours(23, 59, 59, 999);
	return result;
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, months: number) {
	return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthRange(date: Date) {
	return {
		from: toDateInputValue(startOfMonth(date).toISOString()),
		to: toDateInputValue(endOfMonth(date).toISOString()),
	};
}

function startOfYear(date: Date) {
	return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date) {
	return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function getBucketKey(value: string, groupBy: GroupBy) {
	const date = new Date(value);
	if (groupBy === "year") {
		return String(date.getFullYear());
	}
	if (groupBy === "month") {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
	}
	const weekStart = new Date(date);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());
	return weekStart.toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
	if (!value) {
		return null;
	}
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function formatMonthHeading(value: string) {
	const date = new Date(`${value}-01T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
	}).format(date);
}

function formatDisplayMonth(value: Date) {
	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
	}).format(value);
}

function formatMoney(amountMinor: number, currency: Currency) {
	return new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amountMinor);
}

function compactMoney(value: number) {
	return new Intl.NumberFormat("ja-JP", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}

function chartLabel(value: string) {
	return { income: "収入", expense: "支出", net: "純利益" }[value] ?? value;
}

function paymentMethodLabel(value: PaymentMethod) {
	return (
		paymentMethodOptions.find((option) => option.value === value)?.label ??
		"その他"
	);
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? fallback;
}
