import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PageTransition } from "@/components/page-transition";
import { SiteHeader } from "@/components/site-header";
import {
	shouldShowLoginButton,
	shouldShowSignupButton,
} from "@/lib/auth-settings";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const siteSettings = getSiteSettings();

export const metadata: Metadata = {
	title: siteSettings.name,
	description: siteSettings.description,
};

export default function RootLayout({
	children,
	modal,
}: Readonly<{
	children: React.ReactNode;
	modal: React.ReactNode;
}>) {
	return (
		<html lang="ja">
			<body
				className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
			>
				<SiteHeader
					siteName={siteSettings.name}
					siteHeaderIcon={siteSettings.headerIcon}
					showLoginButton={shouldShowLoginButton()}
					showSignupButton={shouldShowSignupButton()}
				/>
				<main className="w-full px-6 pb-10 pt-24 transition-[padding] duration-300 ease-out md:pl-24 md:pr-10 md:pt-10">
					<div className="mx-auto w-full max-w-6xl">
						<PageTransition>{children}</PageTransition>
					</div>
				</main>
				{modal}
			</body>
		</html>
	);
}
