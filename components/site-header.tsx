"use client";

import { CheckSquare2, LogIn, LogOut, Menu, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-actions";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
	{
		href: "/",
		label: "Todo",
		icon: CheckSquare2,
	},
	{
		href: "/login",
		label: "ログイン",
		icon: LogIn,
	},
	{
		href: "/signup",
		label: "登録",
		icon: UserPlus,
	},
];

export function SiteHeader() {
	const { data: session, isPending } = authClient.useSession();
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const userInitial =
		session?.user?.name?.charAt(0) ?? session?.user?.email?.charAt(0) ?? "?";
	const visibleNavItems = session?.user ? navItems.slice(0, 1) : navItems;
	const closeOnMobile = () => {
		if (window.matchMedia("(max-width: 767px)").matches) {
			setIsOpen(false);
		}
	};

	return (
		<>
			{isOpen ? (
				<button
					type="button"
					aria-label="サイドバーを閉じる"
					className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			) : null}

			<button
				type="button"
				aria-label="サイドバーを開く"
				aria-expanded={isOpen}
				className={cn(
					"fixed left-4 top-4 z-50 inline-flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition md:hidden",
					isOpen && "opacity-0 pointer-events-none",
				)}
				onClick={() => setIsOpen(true)}
			>
				<Menu className="size-5" />
			</button>

			<aside
				data-sidebar-state={isOpen ? "open" : "closed"}
				className={cn(
					"fixed z-40 flex flex-col border-border bg-background text-foreground transition-all duration-300 ease-out",
					"md:w-16",
					isOpen
						? "left-4 top-4 bottom-4 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border bg-background/95 p-3 shadow-sm backdrop-blur md:left-4 md:w-64 md:border md:p-4"
						: "-left-24 top-4 bottom-4 w-16 md:left-4 md:top-4 md:bottom-4 md:rounded-3xl md:border md:p-2",
				)}
			>
				<div
					className={cn(
						"flex gap-2",
						isOpen ? "items-center justify-between" : "flex-col items-center",
					)}
				>
					<Link
						href="/"
						className={cn(
							"flex min-w-0 items-center gap-3 rounded-2xl text-sm font-semibold text-foreground transition hover:bg-muted",
							isOpen ? "px-3 py-2" : "justify-center p-2 md:size-12",
						)}
						onClick={closeOnMobile}
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
							<CheckSquare2 className="size-4" />
						</span>
						<span className={cn("truncate", !isOpen && "sr-only")}>
							Todo App
						</span>
					</Link>

					<button
						type="button"
						aria-label={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
						aria-expanded={isOpen}
						className={cn(
							"grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground",
							!isOpen && "hidden md:grid",
						)}
						onClick={() => setIsOpen((current) => !current)}
					>
						{isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
					</button>
				</div>

				<nav className="mt-6 flex flex-col gap-2">
					{visibleNavItems.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 rounded-2xl border border-transparent text-sm font-medium transition",
									isOpen ? "px-3 py-2.5" : "justify-center p-3",
									isActive
										? "border-primary/30 bg-primary/10 text-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
								onClick={closeOnMobile}
							>
								<Icon className="size-5 shrink-0" />
								<span className={cn("truncate", !isOpen && "sr-only")}>
									{item.label}
								</span>
							</Link>
						);
					})}
				</nav>

				<div className="mt-auto border-t border-border pt-3">
					{isPending ? (
						<div
							className={cn(
								"text-sm text-muted-foreground",
								isOpen ? "px-3 py-2" : "text-center",
							)}
						>
							{isOpen ? "Loading..." : "..."}
						</div>
					) : session?.user ? (
						<div className="space-y-3">
							<div
								className={cn(
									"flex items-center gap-3 rounded-2xl",
									isOpen ? "px-3 py-2" : "justify-center p-2",
								)}
							>
								<div className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-sm font-semibold uppercase">
									{userInitial}
								</div>
								<div className={cn("min-w-0", !isOpen && "sr-only")}>
									<p className="truncate text-sm font-semibold text-foreground">
										{session.user.name ?? "Unnamed"}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{session.user.email}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								className={cn("w-full", isOpen ? "justify-start" : "px-0")}
								onClick={() => {
									void signOut();
								}}
							>
								<LogOut className="size-4" />
								<span className={cn(!isOpen && "sr-only")}>ログアウト</span>
							</Button>
						</div>
					) : (
						<div className={cn("space-y-2", !isOpen && "hidden")}>
							<p className="px-3 text-xs text-muted-foreground">
								アカウント未接続
							</p>
							<Link
								href="/login"
								className="flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
								onClick={closeOnMobile}
							>
								ログイン
							</Link>
						</div>
					)}
				</div>
			</aside>
		</>
	);
}
