import { createHonoApp } from "@/server/create-app";
import apiKeysRoute from "@/server/routes/api-keys";
import authRoute from "@/server/routes/auth";
import developerRoute from "@/server/routes/developer";
import financeRoute from "@/server/routes/finance";
import notificationsRoute from "@/server/routes/notifications";
import scrapsRoute from "@/server/routes/scraps";
import subscriptionsRoute from "@/server/routes/subscriptions";
import todosRoute from "@/server/routes/todos";

const app = createHonoApp()
	.basePath("/api")
	.route("/api-keys", apiKeysRoute)
	.route("/auth", authRoute)
	.route("/developer", developerRoute)
	.route("/finance", financeRoute)
	.route("/notifications", notificationsRoute)
	.route("/scraps", scrapsRoute)
	.route("/subscriptions", subscriptionsRoute)
	.route("/todos", todosRoute);

export type AppType = typeof app;
export { app };
