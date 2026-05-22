import { notFound } from "next/navigation";

import {
	isSignupEndpointEnabled,
	shouldShowSignupButton,
} from "@/lib/auth-settings";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
	if (!shouldShowSignupButton() || !isSignupEndpointEnabled()) {
		notFound();
	}

	return <SignupForm />;
}
