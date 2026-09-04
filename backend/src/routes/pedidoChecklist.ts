import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { checklistItemInputSchema, checklistItemUpdateSchema } from "../schemas/pedidoChecklistItem.js";
import checklistTemplate from "../data/checklistTemplate.json" with { type: "json" };

export async function pedidoChecklistRoutes(app: FastifyInstance) {
  /**
   * Gera a matriz de checklist (113 itens) num pedido que ainda não tem
   * nenhum — pedidos criados antes da matriz existir não nasceram com ela.
   * Não duplica: recusa se o pedido já tiver algum item.
   */
  app.post("/pedidos/:id/checklist/gerar-matriz", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [pedido] = await sql`SELECT id FROM pedidos WHERE id = ${id}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    const [{ total }] = await sql<{ total: string }[]>`SELECT count(*) AS total FROM pedido_checklist_itens WHERE pedido_id = ${id}`;
    if (Number(total) > 0) {
      return reply.code(409).send({ error: "Este pedido já tem itens de checklist — apague-os antes de gerar a matriz de novo" });
    }
    for (let i = 0; i < checklistTemplate.length; i++) {
      const item = checklistTemplate[i];
      await sql`
        INSERT INTO pedido_checklist_itens (pedido_id, descricao, grupo, ordem)
        VALUES (${id}, ${item.descricao}, ${item.grupo}, ${i})
      `;
    }
    const checklist = await sql`SELECT * FROM pedido_checklist_itens WHERE pedido_id = ${id} ORDER BY ordem`;
    return reply.code(201).send(checklist);
  });

  app.post("/pedidos/:id/checklist", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [pedido] = await sql`SELECT id FROM pedidos WHERE id = ${id}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    const parsed = checklistItemInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { descricao, grupo, ordem } = parsed.data;

    const [item] = await sql`
      INSERT INTO pedido_checklist_itens (pedido_id, descricao, grupo, ordem)
      VALUES (${id}, ${descricao}, ${grupo ?? null}, ${ordem})
      RETURNING *
    `;
    return reply.code(201).send(item);
  });

  app.put("/pedidos/:id/checklist/:itemId", async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const [existing] = await sql`SELECT * FROM pedido_checklist_itens WHERE id = ${itemId} AND pedido_id = ${id}`;
    if (!existing) {
      return reply.code(404).send({ error: "Item não encontrado" });
    }
    const parsed = checklistItemUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const descricao = data.descricao ?? existing.descricao;
    const grupo = data.grupo !== undefined ? data.grupo : existing.grupo;
    const ordem = data.ordem ?? existing.ordem;
    const concluido = data.concluido ?? existing.concluido;
    // concluido_em só muda quando concluido muda de fato (não fica reescrevendo a cada PUT).
    const concluidoEm = concluido === existing.concluido ? existing.concluido_em : concluido ? new Date() : null;

    const [item] = await sql`
      UPDATE pedido_checklist_itens SET
        descricao = ${descricao},
        grupo = ${grupo},
        ordem = ${ordem},
        concluido = ${concluido},
        concluido_em = ${concluidoEm}
      WHERE id = ${itemId}
      RETURNING *
    `;
    return item;
  });

  app.delete("/pedidos/:id/checklist/:itemId", async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const [item] = await sql`
      DELETE FROM pedido_checklist_itens WHERE id = ${itemId} AND pedido_id = ${id} RETURNING *
    `;
    if (!item) {
      return reply.code(404).send({ error: "Item não encontrado" });
    }
    return reply.code(204).send();
  });
}
