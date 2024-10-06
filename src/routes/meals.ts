import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export async function mealsRoutes(app: FastifyInstance) {
	app.post(
		"/",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const createMealBodySchema = z.object({
				name: z.string(),
				description: z.string(),
				isOnDiet: z.boolean(),
				date: z.coerce.date(),
			});

			const { name, date, description, isOnDiet } = createMealBodySchema.parse(
				request.body,
			);

			await knex("meals").insert({
				id: randomUUID(),
				name,
				description,
				is_on_diet: isOnDiet,
				date,
				user_id: request.user?.id,
			});

			return reply.code(201).send();
		},
	);

	app.get(
		"/",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const meals = await knex("meals")
				.where({ user_id: request.user?.id })
				.orderBy("date", "desc");

			return reply.send({ meals });
		},
	);

	app.get(
		"/:id",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid(),
			});

			const { id } = paramsSchema.parse(request.params);

			const meal = await knex("meals")
				.where({ id, user_id: request.user?.id })
				.first();

			if (!meal) {
				return reply.code(404).send({
					error: "Meal not found",
				});
			}

			return reply.send({ meal });
		},
	);

	app.put(
		"/:id",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid(),
			});

			const updateMealBodySchema = z.object({
				name: z.string(),
				description: z.string(),
				isOnDiet: z.boolean(),
				date: z.coerce.date(),
			});

			const { date, description, isOnDiet, name } = updateMealBodySchema.parse(
				request.body,
			);

			const { id } = paramsSchema.parse(request.params);

			const meal = await knex("meals")
				.where({ id, user_id: request.user?.id })
				.first();

			if (!meal) {
				return reply.code(404).send({
					error: "Meal not found",
				});
			}

			await knex("meals").where({ id }).update({
				name,
				description,
				is_on_diet: isOnDiet,
				date,
			});

			return reply.status(204).send();
		},
	);

	app.delete(
		"/:id",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid(),
			});

			const { id } = paramsSchema.parse(request.params);

			const meal = await knex("meals")
				.where({ id, user_id: request.user?.id })
				.first();

			if (!meal) {
				return reply.code(404).send({
					error: "Meal not found",
				});
			}

			await knex("meals").where({ id }).delete();

			return reply.status(204).send();
		},
	);

	app.get(
		"/metrics",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const totalMealsOnDiet = await knex("meals")
				.where({ user_id: request.user?.id, is_on_diet: true })
				.count("id", { as: "total" })
				.first();
			const totalMealsOffDiet = await knex("meals")
				.where({ user_id: request.user?.id, is_on_diet: false })
				.count("id", { as: "total" })
				.first();
			const totalMeals = await knex("meals")
				.where({ user_id: request.user?.id })
				.orderBy("date", "desc");

			const { bestOnDietSequence } = totalMeals.reduce(
				(acc, meal) => {
					if (meal.is_on_diet) {
						acc.currentSequence += 1;
					} else {
						acc.currentSequence = 0;
					}

					if (acc.currentSequence > acc.bestOnDietSequence) {
						acc.bestOnDietSequence = acc.currentSequence;
					}

					return acc;
				},
				{ bestOnDietSequence: 0, currentSequence: 0 },
			);

			return reply.send({
				totalMeals: totalMeals.length,
				totalMealsOnDiet: totalMealsOnDiet?.total,
				totalMealsOffDiet: totalMealsOffDiet?.total,
				bestOnDietSequence,
			});
		},
	);
}
