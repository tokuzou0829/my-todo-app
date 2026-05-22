import { shouldShowSignupButton } from "@/lib/auth-settings";

import { LoginForm } from "./login-form";

export default function LoginPage() {
	return <LoginForm showSignupLink={shouldShowSignupButton()} />;
}
