import { createHonoApp } from "@/server/create-app";
import apiKeysRoute from "@/server/routes/api-keys";
import authRoute from "@/server/routes/auth";
import developerRoute from "@/server/routes/developer";
import notificationsRoute from "@/server/routes/notifications";
import subscriptionsRoute from "@/server/routes/subscriptions";
import todosRoute from "@/server/routes/todos";

const app = createHonoApp()
	.basePath("/api")
	.route("/api-keys", apiKeysRoute)
	.route("/auth", authRoute)
	.route("/developer", developerRoute)
	.route("/notifications", notificationsRoute)
	.route("/subscriptions", subscriptionsRoute)
	.route("/todos", todosRoute);

export type AppType = typeof app;
export { app };
