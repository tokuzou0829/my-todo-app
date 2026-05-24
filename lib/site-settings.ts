const DEFAULT_SITE_NAME = "Todo App";
const DEFAULT_SITE_DESCRIPTION = "A simple authenticated todo app";

function getStringEnv(value: string | undefined, fallback: string) {
	const trimmedValue = value?.trim();

	return trimmedValue ? trimmedValue : fallback;
}

function getOptionalStringEnv(value: string | undefined) {
	const trimmedValue = value?.trim();

	return trimmedValue || undefined;
}

export function getSiteSettings() {
	const name = getStringEnv(process.env.SITE_NAME, DEFAULT_SITE_NAME);

	return {
		name,
		description: getStringEnv(
			process.env.SITE_DESCRIPTION,
			DEFAULT_SITE_DESCRIPTION,
		),
		headerIcon: getOptionalStringEnv(process.env.SITE_HEADER_ICON),
		manifestShortName: getStringEnv(process.env.MANIFEST_SHORT_NAME, name),
	};
}
