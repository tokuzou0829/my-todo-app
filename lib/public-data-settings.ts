const defaultEnabled = false;

function getBooleanFlag(value: boolean | string | undefined) {
	if (value === undefined) {
		return defaultEnabled;
	}

	if (typeof value === "boolean") {
		return value;
	}

	return value === "true";
}

export function isPublicFirstUserEnabled() {
	return getBooleanFlag(process.env.IS_PUBLIC_FIRST_USER);
}
