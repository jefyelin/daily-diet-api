import cookie from "@fastify/cookie";
import fastify from "fastify";
import { mealsRoutes } from "./routes/meals";
import { usersRoutes } from "./routes/users";

export const app = fastify();

app.addHook("preHandler", async (request, reply) => {
	console.log(`${request.method} ${request.url}`);
});

app.register(cookie);
app.register(usersRoutes, { prefix: "/users" });
app.register(mealsRoutes, { prefix: "/meals" });
