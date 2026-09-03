import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { envDefaults, mergeParams } from "../config/params.js";
import { lerPtaxReferencia } from "../repo/bcbPtax.js";

const valorSchema = z.object({ valor: z.string().min(1) });

export async function parametrosRoutes(app: FastifyInstance) {
  app.get("/parametros", async () => {
    const rows = await sql<
      { chave: string; valor: string; atualizado_em: Date }[]
    >`SELECT chave, valor, atualizado_em FROM parametros`;
    const params = mergeParams(envDefaults(), rows);
    const cambioRow = rows.find((r) => r.chave === "cambio");
    const ptaxReferencia = await lerPtaxReferencia();
    return { ...params, cambioAtualizadoEm: cambioRow?.atualizado_em ?? null, ptaxReferencia };
  });

  app.put("/parametros/:chave", async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const parsed = valorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const [linha] = await sql`
      INSERT INTO parametros (chave, valor, atualizado_em)
      VALUES (${chave}, ${parsed.data.valor}, now())
      ON CONFLICT (chave) DO UPDATE SET valor = ${parsed.data.valor}, atualizado_em = now()
      RETURNING *
    `;
    return linha;
  });
}
