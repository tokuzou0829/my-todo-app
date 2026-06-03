import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

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
const performanceMeasureGuardScript = `
(() => {
	const originalMeasure = performance.measure?.bind(performance);
	if (!originalMeasure || performance.measure.__negativeTimestampGuard) {
		return;
	}

	function sanitizeMeasureOptions(value) {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			return value;
		}

		const options = { ...value };
		if (typeof options.start === "number" && options.start < 0) {
			options.start = 0;
		}
		if (typeof options.end === "number" && options.end < 0) {
			options.end = 0;
		}
		if (
			typeof options.start === "number" &&
			typeof options.end === "number" &&
			options.end < options.start
		) {
			options.end = options.start;
		}
		return options;
	}

	function guardedMeasure(name, startOrOptions, endMark) {
		try {
			return originalMeasure(name, startOrOptions, endMark);
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			const isReactComponentMeasure =
				typeof name === "string" && name.charCodeAt(0) === 8203;
			if (!isReactComponentMeasure || !message.includes("negative time stamp")) {
				throw error;
			}

			return originalMeasure(name, sanitizeMeasureOptions(startOrOptions), endMark);
		}
	}

	Object.defineProperty(guardedMeasure, "__negativeTimestampGuard", {
		value: true,
	});
	performance.measure = guardedMeasure;
})();`;

export const metadata: Metadata = {
	metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
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
				{process.env.NODE_ENV === "development" ? (
					<Script id="performance-measure-guard" strategy="beforeInteractive">
						{performanceMeasureGuardScript}
					</Script>
				) : null}
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
