import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";

const quantidadeSchema = z.object({ quantidade: z.number().nonnegative() });
const transitoSchema = z.object({ quantidade: z.number().nonnegative(), observacoes: z.string().min(1).optional() });

export async function estoqueRoutes(app: FastifyInstance) {
  app.get("/estoque", async () => sql`SELECT * FROM estoque ORDER BY sku`);

  app.put("/estoque/:sku", async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const [produto] = await sql`SELECT sku FROM produtos WHERE sku = ${sku}`;
    if (!produto) {
      return reply.code(404).send({ error: "Produto não encontrado" });
    }
    const parsed = quantidadeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const [linha] = await sql`
      INSERT INTO estoque (sku, quantidade, atualizado_em)
      VALUES (${sku}, ${parsed.data.quantidade}, now())
      ON CONFLICT (sku) DO UPDATE SET quantidade = ${parsed.data.quantidade}, atualizado_em = now()
      RETURNING *
    `;
    return linha;
  });

  app.get("/em-transito", async () => sql`SELECT * FROM em_transito ORDER BY sku`);

  app.put("/em-transito/:sku", async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const [produto] = await sql`SELECT sku FROM produtos WHERE sku = ${sku}`;
    if (!produto) {
      return reply.code(404).send({ error: "Produto não encontrado" });
    }
    const parsed = transitoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { quantidade, observacoes } = parsed.data;
    const [linha] = await sql`
      INSERT INTO em_transito (sku, quantidade, observacoes, atualizado_em)
      VALUES (${sku}, ${quantidade}, ${observacoes ?? null}, now())
      ON CONFLICT (sku) DO UPDATE SET
        quantidade = ${quantidade}, observacoes = ${observacoes ?? null}, atualizado_em = now()
      RETURNING *
    `;
    return linha;
  });
}
