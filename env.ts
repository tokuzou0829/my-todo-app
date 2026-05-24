import { loadEnvConfig } from "@next/env";
import { z } from "zod";

const booleanString = z
	.enum(["true", "false"])
	.default("true")
	.transform((value) => value === "true");

const staticEnv = z.object({
	NODE_ENV: z
		.union([
			z.literal("development"),
			z.literal("test"),
			z.literal("production"),
		])
		.default("development"),

	//better-auth
	BETTER_AUTH_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(1),
	AUTH_SHOW_LOGIN_BUTTON: booleanString,
	AUTH_SHOW_SIGNUP_BUTTON: booleanString,
	AUTH_SIGNUP_ENDPOINT_ENABLED: booleanString,

	//site
	SITE_NAME: z.string().min(1).default("Todo App"),
	SITE_DESCRIPTION: z
		.string()
		.min(1)
		.default("A simple authenticated todo app"),
	SITE_HEADER_ICON: z.string().default(""),
	MANIFEST_SHORT_NAME: z.string().min(1).default("Todo App"),

	// for server
	DATABASE_URL: z.url(),
	R2_S3_URL: z.url(),
	R2_ACCESS_KEY_ID: z.string().min(1),
	R2_SECRET_ACCESS_KEY: z.string().min(1),
	R2_PUBLIC_URL: z.url(),
	R2_BUCKET_NAME: z.string().min(1),

	//push notification
	NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
	VAPID_PRIVATE_KEY: z.string().min(1),
});

const runtimeEnv = z.object({});

export type Schema = z.infer<typeof schema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const schema = z.intersection(staticEnv, runtimeEnv);

export function config(kind: "static" | "runtime" = "static") {
	if (process.env.SKIP_ENV_VALIDATION === "true") return;

	const { combinedEnv } = loadEnvConfig(process.cwd());
	const res =
		kind === "static"
			? staticEnv.safeParse(combinedEnv)
			: runtimeEnv.safeParse(combinedEnv);

	if (res.error) {
		console.error("\x1b[31m%s\x1b[0m", "[Errors] environment variables");
		console.error(JSON.stringify(res.error.issues, null, 2));
		process.exit(1);
	}
}
