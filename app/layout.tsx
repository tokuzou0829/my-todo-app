import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Todo App",
	description: "A simple authenticated todo app",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja">
			<body
				className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
			>
				<SiteHeader />
				<main className="w-full px-6 pb-10 pt-24 transition-[padding] duration-300 ease-out md:pl-24 md:pr-10 md:pt-10">
					<div className="mx-auto w-full max-w-6xl">{children}</div>
				</main>
			</body>
		</html>
	);
}
