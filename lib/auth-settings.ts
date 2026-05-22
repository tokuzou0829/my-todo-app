const defaultEnabled = true;

function getBooleanFlag(value: boolean | string | undefined) {
	if (value === undefined) {
		return defaultEnabled;
	}

	if (typeof value === "boolean") {
		return value;
	}

	return value === "true";
}

export function shouldShowLoginButton() {
	return getBooleanFlag(process.env.AUTH_SHOW_LOGIN_BUTTON);
}

export function shouldShowSignupButton() {
	return (
		getBooleanFlag(process.env.AUTH_SHOW_SIGNUP_BUTTON) &&
		isSignupEndpointEnabled()
	);
}

export function isSignupEndpointEnabled() {
	return getBooleanFlag(process.env.AUTH_SIGNUP_ENDPOINT_ENABLED);
}
