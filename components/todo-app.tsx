"use client";

import { CalendarClock, Check, Pencil, Tag, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

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

type TodoPriority = "none" | "low" | "medium" | "high";

type Todo = {
	id: string;
	userId: string;
	title: string;
	priority: TodoPriority;
	dueAt: string | null;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
};

type TodoResponse = {
	todo: Todo;
};

type TodosResponse = {
	todos: Todo[];
};

const priorityOptions: Array<{ value: TodoPriority; label: string }> = [
	{ value: "none", label: "順位なし" },
	{ value: "low", label: "低" },
	{ value: "medium", label: "中" },
	{ value: "high", label: "高" },
];

const priorityLabels: Record<TodoPriority, string> = {
	none: "順位なし",
	low: "低",
	medium: "中",
	high: "高",
};

const priorityRank: Record<TodoPriority, number> = {
	high: 0,
	medium: 1,
	low: 2,
	none: 3,
};

export function TodoApp() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [title, setTitle] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
	const [draftPriority, setDraftPriority] = useState<TodoPriority>("none");
	const [draftDueDate, setDraftDueDate] = useState("");
	const [draftDueTime, setDraftDueTime] = useState("");
	const [isSavingOptions, setIsSavingOptions] = useState(false);

	useEffect(() => {
		let ignore = false;

		const loadTodos = async () => {
			setError(null);
			const response = await apiClient.api.todos.$get();

			if (!response.ok) {
				if (!ignore) {
					setError(
						await getErrorMessage(response, "Todo の取得に失敗しました"),
					);
					setIsLoading(false);
				}
				return;
			}

			const body = (await response.json()) as TodosResponse;
			if (!ignore) {
				setTodos(sortTodos(body.todos));
				setIsLoading(false);
			}
		};

		void loadTodos();

		return () => {
			ignore = true;
		};
	}, []);

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedTitle = title.trim();

		if (!trimmedTitle) {
			return;
		}

		setIsCreating(true);
		setError(null);
		const response = await apiClient.api.todos.$post({
			json: {
				title: trimmedTitle,
			},
		});

		if (!response.ok) {
			setError(await getErrorMessage(response, "Todo の追加に失敗しました"));
			setIsCreating(false);
			return;
		}

		const body = (await response.json()) as TodoResponse;
		setTodos((current) => sortTodos([body.todo, ...current]));
		setTitle("");
		setIsCreating(false);
	};

	const toggleTodo = async (todo: Todo) => {
		const nextCompleted = !todo.completed;
		setTodos((current) =>
			sortTodos(
				current.map((item) =>
					item.id === todo.id ? { ...item, completed: nextCompleted } : item,
				),
			),
		);
		setError(null);

		const response = await apiClient.api.todos[":id"].$patch({
			param: { id: todo.id },
			json: { completed: nextCompleted },
		});

		if (!response.ok) {
			setTodos((current) =>
				sortTodos(current.map((item) => (item.id === todo.id ? todo : item))),
			);
			setError(await getErrorMessage(response, "Todo の更新に失敗しました"));
			return;
		}

		const body = (await response.json()) as TodoResponse;
		setTodos((current) =>
			sortTodos(
				current.map((item) => (item.id === body.todo.id ? body.todo : item)),
			),
		);
	};

	const deleteTodo = async (todo: Todo) => {
		setTodos((current) => current.filter((item) => item.id !== todo.id));
		setError(null);

		const response = await apiClient.api.todos[":id"].$delete({
			param: { id: todo.id },
		});

		if (!response.ok) {
			setTodos((current) => sortTodos([todo, ...current]));
			setError(await getErrorMessage(response, "Todo の削除に失敗しました"));
		}
	};

	const openOptions = (todo: Todo) => {
		const dueAtParts = toDateTimeLocalParts(todo.dueAt);
		setSelectedTodo(todo);
		setDraftPriority(todo.priority);
		setDraftDueDate(dueAtParts.date);
		setDraftDueTime(dueAtParts.time);
	};

	const closeOptions = () => {
		if (!isSavingOptions) {
			setSelectedTodo(null);
		}
	};

	const saveOptions = async () => {
		if (!selectedTodo) {
			return;
		}

		const dueAt = toDueAtIsoString(draftDueDate, draftDueTime);
		setIsSavingOptions(true);
		setError(null);

		const response = await apiClient.api.todos[":id"].$patch({
			param: { id: selectedTodo.id },
			json: {
				priority: draftPriority,
				dueAt,
			},
		});

		if (!response.ok) {
			setError(
				await getErrorMessage(response, "Todo のオプション更新に失敗しました"),
			);
			setIsSavingOptions(false);
			return;
		}

		const body = (await response.json()) as TodoResponse;
		setTodos((current) =>
			sortTodos(
				current.map((item) => (item.id === body.todo.id ? body.todo : item)),
			),
		);
		setSelectedTodo(null);
		setIsSavingOptions(false);
	};

	const clearDueAt = () => {
		setDraftDueDate("");
		setDraftDueTime("");
	};

	const completedCount = todos.filter((todo) => todo.completed).length;

	return (
		<div className="space-y-10">
			<section className="space-y-6">
				<div className="flex flex-col gap-4 border-border border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-1">
						<h2 className="font-semibold text-2xl text-foreground tracking-tight">
							Todo List
						</h2>
						<p className="text-muted-foreground text-sm">
							{todos.length} 件中 {completedCount} 件完了
						</p>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-56">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{
								width: todos.length
									? `${Math.round((completedCount / todos.length) * 100)}%`
									: "0%",
							}}
						/>
					</div>
				</div>

				<form
					onSubmit={handleCreate}
					className="flex flex-col gap-3 sm:flex-row"
				>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="例: 週次レビューをする"
						aria-label="Todo title"
						className="bg-background"
					/>
					<Button type="submit" disabled={isCreating || !title.trim()}>
						{isCreating ? "追加中..." : "追加"}
					</Button>
				</form>

				{error ? (
					<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
						{error}
					</p>
				) : null}

				{isLoading ? (
					<p className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
						Todo を読み込んでいます...
					</p>
				) : todos.length ? (
					<ul className="divide-y divide-border border-border border-y">
						{todos.map((todo) => (
							<li
								key={todo.id}
								className="relative flex items-center gap-3 px-4 py-4 transition hover:bg-accent focus-within:bg-accent"
							>
								<button
									type="button"
									className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
									onClick={() => {
										void toggleTodo(todo);
									}}
									aria-pressed={todo.completed}
									aria-label={`${todo.title} を${todo.completed ? "未完了に戻す" : "完了にする"}`}
								/>
								<span
									aria-hidden="true"
									className={cn(
										"pointer-events-none relative z-20 flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs",
										todo.completed &&
											"border-primary bg-primary text-primary-foreground",
									)}
								>
									{todo.completed ? <Check className="size-4" /> : null}
								</span>
								<div className="pointer-events-none relative z-20 min-w-0 flex-1">
									<span
										className={cn(
											"block truncate font-medium text-foreground text-sm",
											todo.completed && "text-muted-foreground line-through",
										)}
									>
										{todo.title}
									</span>
									<div className="mt-2 flex flex-wrap items-center gap-2">
										<PriorityBadge priority={todo.priority} />
										{todo.dueAt ? (
											<Badge
												variant="outline"
												className="gap-1 text-muted-foreground"
											>
												<CalendarClock className="size-3" />
												{formatDueAt(todo.dueAt)}
											</Badge>
										) : null}
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="relative z-30 text-muted-foreground hover:text-foreground"
									onClick={(event) => {
										event.stopPropagation();
										openOptions(todo);
									}}
									aria-label={`${todo.title} のオプションを開く`}
								>
									<Pencil className="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="relative z-30 text-muted-foreground hover:text-destructive"
									onClick={(event) => {
										event.stopPropagation();
										void deleteTodo(todo);
									}}
									aria-label={`${todo.title} を削除する`}
								>
									<Trash2 className="size-4" />
								</Button>
							</li>
						))}
					</ul>
				) : (
					<div className="rounded-2xl border border-primary/40 border-dashed bg-primary/5 px-4 py-10 text-center">
						<p className="font-semibold text-foreground text-sm">
							まだ Todo はありません
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							最初のタスクを追加して始めましょう。
						</p>
					</div>
				)}
			</section>

			<Dialog
				open={selectedTodo !== null}
				onOpenChange={(open) => !open && closeOptions()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Todo オプション</DialogTitle>
						<DialogDescription>
							順位タグと期限を設定できます。
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5">
						<div className="rounded-lg border bg-muted/40 p-3">
							<p className="font-medium text-foreground text-sm">
								{selectedTodo?.title}
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="todo-priority">順位タグ</Label>
							<Select
								value={draftPriority}
								onValueChange={(value) =>
									setDraftPriority(value as TodoPriority)
								}
							>
								<SelectTrigger id="todo-priority" className="w-full">
									<SelectValue placeholder="順位を選択" />
								</SelectTrigger>
								<SelectContent>
									{priorityOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between gap-3">
								<Label htmlFor="todo-due-date">期限</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-muted-foreground"
									onClick={clearDueAt}
									disabled={!draftDueDate && !draftDueTime}
								>
									期限をクリア
								</Button>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="grid gap-2">
									<Label
										htmlFor="todo-due-date"
										className="text-muted-foreground text-xs"
									>
										日付
									</Label>
									<Input
										id="todo-due-date"
										type="date"
										value={draftDueDate}
										onChange={(event) => {
											setDraftDueDate(event.target.value);
											if (event.target.value && !draftDueTime) {
												setDraftDueTime("23:59");
											}
										}}
									/>
								</div>
								<div className="grid gap-2">
									<Label
										htmlFor="todo-due-time"
										className="text-muted-foreground text-xs"
									>
										時間
									</Label>
									<Input
										id="todo-due-time"
										type="time"
										value={draftDueTime}
										onChange={(event) => setDraftDueTime(event.target.value)}
										disabled={!draftDueDate}
									/>
								</div>
							</div>
							<p className="text-muted-foreground text-xs">
								日付を入れると時間は 23:59
								で初期設定されます。空にすると期限なしになります。
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={closeOptions}
							disabled={isSavingOptions}
						>
							キャンセル
						</Button>
						<Button
							onClick={() => void saveOptions()}
							disabled={isSavingOptions}
						>
							{isSavingOptions ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function PriorityBadge({ priority }: { priority: TodoPriority }) {
	if (priority === "none") {
		return (
			<Badge variant="outline" className="gap-1 text-muted-foreground">
				<Tag className="size-3" />
				{priorityLabels[priority]}
			</Badge>
		);
	}

	return (
		<Badge
			variant={priority === "high" ? "destructive" : "secondary"}
			className={cn(
				"gap-1",
				priority === "medium" && "bg-primary/20 text-primary-foreground",
				priority === "low" && "bg-muted text-muted-foreground",
			)}
		>
			<Tag className="size-3" />
			{priorityLabels[priority]}
		</Badge>
	);
}

function sortTodos(todos: Todo[]) {
	return [...todos].sort((left, right) => {
		const priorityDiff =
			priorityRank[left.priority] - priorityRank[right.priority];
		if (priorityDiff !== 0) {
			return priorityDiff;
		}

		const leftDue = left.dueAt
			? new Date(left.dueAt).getTime()
			: Number.POSITIVE_INFINITY;
		const rightDue = right.dueAt
			? new Date(right.dueAt).getTime()
			: Number.POSITIVE_INFINITY;
		if (leftDue !== rightDue) {
			return leftDue - rightDue;
		}

		return (
			new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
		);
	});
}

function toDateTimeLocalParts(value: string | null) {
	if (!value) {
		return { date: "", time: "" };
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return { date: "", time: "" };
	}

	const localDate = new Date(
		date.getTime() - date.getTimezoneOffset() * 60_000,
	);
	const valueText = localDate.toISOString();
	return {
		date: valueText.slice(0, 10),
		time: valueText.slice(11, 16),
	};
}

function toDueAtIsoString(date: string, time: string) {
	if (!date) {
		return null;
	}

	const dueAt = new Date(`${date}T${time || "23:59"}`);
	if (Number.isNaN(dueAt.getTime())) {
		return null;
	}

	return dueAt.toISOString();
}

function formatDueAt(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "期限あり";
	}

	return new Intl.DateTimeFormat("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

async function getErrorMessage(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? fallback;
}
