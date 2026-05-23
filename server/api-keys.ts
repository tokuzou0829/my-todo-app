import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "tdo_live_";

export function generateApiKey() {
	const key = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;

	return {
		key,
		keyHash: hashApiKey(key),
		keyPrefix: key.slice(0, 18),
	};
}

export function hashApiKey(key: string) {
	return createHash("sha256").update(key).digest("hex");
}

export function getApiKeyFromHeaders(headers: Headers) {
	const authorization = headers.get("authorization");
	if (authorization?.startsWith("Bearer ")) {
		return authorization.slice("Bearer ".length).trim();
	}

	return headers.get("x-api-key")?.trim() || null;
}
