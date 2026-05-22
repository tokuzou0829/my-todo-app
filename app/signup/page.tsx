"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "@/lib/auth-actions";

export default function SignupPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await signUpWithEmail({
			name,
			email,
			password,
		});

		if (!result.success) {
			setError(result.error ?? "Signup failed");
			setIsLoading(false);
			return;
		}

		router.push("/");
	};

	return (
		<div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
			<Card>
				<CardHeader>
					<div className="mb-3 size-10 rounded-2xl bg-primary/15 p-2">
						<div className="size-full rounded-xl bg-primary" />
					</div>
					<CardTitle>新規登録</CardTitle>
					<CardDescription>
						Todo を自分だけのリストとして保存するためのアカウントを作成します。
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="mt-6 space-y-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>
						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "作成中..." : "アカウントを作成"}
						</Button>
					</form>
					{error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
					<p className="mt-6 text-sm text-muted-foreground">
						すでにアカウントがありますか?{" "}
						<Link
							href="/login"
							className="font-semibold text-primary-foreground underline decoration-primary decoration-2 underline-offset-4"
						>
							ログイン
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
