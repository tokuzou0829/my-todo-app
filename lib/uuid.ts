const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_SEARCH_PATTERN =
	/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isUuid(value: string) {
	return UUID_PATTERN.test(value);
}

export function extractUuid(value: string) {
	return value.match(UUID_SEARCH_PATTERN)?.[0] ?? null;
}
