import { createHonoApp } from "@/server/create-app";
import authRoute from "@/server/routes/auth";
import notificationsRoute from "@/server/routes/notifications";
import todosRoute from "@/server/routes/todos";

const app = createHonoApp()
	.basePath("/api")
	.route("/auth", authRoute)
	.route("/notifications", notificationsRoute)
	.route("/todos", todosRoute);

export type AppType = typeof app;
export { app };
