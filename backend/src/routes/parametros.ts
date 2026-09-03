import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { envDefaults, mergeParams } from "../config/params.js";

const valorSchema = z.object({ valor: z.string().min(1) });

export async function parametrosRoutes(app: FastifyInstance) {
  app.get("/parametros", async () => {
    const rows = await sql<{ chave: string; valor: string }[]>`SELECT chave, valor FROM parametros`;
    return mergeParams(envDefaults(), rows);
  });

  app.put("/parametros/:chave", async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const parsed = valorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const [linha] = await sql`
      INSERT INTO parametros (chave, valor)
      VALUES (${chave}, ${parsed.data.valor})
      ON CONFLICT (chave) DO UPDATE SET valor = ${parsed.data.valor}
      RETURNING *
    `;
    return linha;
  });
}
