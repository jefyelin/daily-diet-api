import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";

export async function usersRoutes(app: FastifyInstance) {
	app.post("/", async (request, reply) => {
		const createUserBodySchema = z.object({
			name: z.string(),
			email: z.string().email(),
		});

		let sessionId = request.cookies.sessionId;

		if (!sessionId) {
			sessionId = randomUUID();

			reply.setCookie("sessionId", sessionId, {
				path: "/",
				maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
			});
		}

		const { name, email } = createUserBodySchema.parse(request.body);

		const userByEmail = await knex("users").where({ email }).first();

		if (userByEmail) {
			return reply.code(409).send({
				error: "User with this email already exists",
			});
		}

		await knex("users").insert({
			id: randomUUID(),
			name,
			email,
			session_id: sessionId,
		});

		return reply.code(201).send();
	});
}
