import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/site-settings";

export default function manifest(): MetadataRoute.Manifest {
	const siteSettings = getSiteSettings();

	return {
		name: siteSettings.name,
		short_name: siteSettings.manifestShortName,
		description: siteSettings.description,
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#000000",
		icons: [
			{
				sizes: "192x192",
				src: "icon192_rounded.png",
				type: "image/png",
			},
			{
				sizes: "512x512",
				src: "icon512_rounded.png",
				type: "image/png",
			},
		],
	};
}
