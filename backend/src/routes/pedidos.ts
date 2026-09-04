import type { FastifyInstance } from "fastify";
import type postgres from "postgres";
import { sql } from "../db.js";
import { pedidoInputSchema, pedidoUpdateSchema } from "../schemas/pedido.js";
import { pedidoItemInputSchema, pedidoItemUpdateSchema } from "../schemas/pedidoItem.js";
import checklistTemplate from "../data/checklistTemplate.json" with { type: "json" };

const asJson = (value: Record<string, unknown>) => value as postgres.JSONValue;

/**
 * Todo pedido novo já nasce com a matriz de checklist inteira da RTX (113
 * itens, 29 grupos — PDF "MATRIZ_CHECK LIST ATUALIZADO"), pra não precisar
 * recriar isso à mão pedido por pedido (decisão 17 do DECISIONS.md:
 * minimizar digitação manual). Cada item nasce desmarcado.
 */
async function semearChecklist(pedidoId: string): Promise<void> {
  for (let i = 0; i < checklistTemplate.length; i++) {
    const item = checklistTemplate[i];
    await sql`
      INSERT INTO pedido_checklist_itens (pedido_id, descricao, grupo, ordem)
      VALUES (${pedidoId}, ${item.descricao}, ${item.grupo}, ${i})
    `;
  }
}

export async function pedidosRoutes(app: FastifyInstance) {
  app.get("/pedidos", async (request) => {
    const { fornecedor_id, status } = request.query as { fornecedor_id?: string; status?: string };
    if (fornecedor_id && status) {
      return sql`SELECT * FROM pedidos WHERE fornecedor_id = ${fornecedor_id} AND status = ${status} ORDER BY criado_em DESC`;
    }
    if (fornecedor_id) {
      return sql`SELECT * FROM pedidos WHERE fornecedor_id = ${fornecedor_id} ORDER BY criado_em DESC`;
    }
    if (status) {
      return sql`SELECT * FROM pedidos WHERE status = ${status} ORDER BY criado_em DESC`;
    }
    return sql`SELECT * FROM pedidos ORDER BY criado_em DESC`;
  });

  app.get("/pedidos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [pedido] = await sql`SELECT * FROM pedidos WHERE id = ${id}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    const itens = await sql`SELECT * FROM pedido_itens WHERE pedido_id = ${id} ORDER BY criado_em`;
    const documentos = await sql`SELECT * FROM pedido_documentos WHERE pedido_id = ${id} ORDER BY enviado_em`;
    const checklist = await sql`SELECT * FROM pedido_checklist_itens WHERE pedido_id = ${id} ORDER BY ordem, criado_em`;
    return { ...pedido, itens, documentos, checklist };
  });

  app.post("/pedidos", async (request, reply) => {
    const parsed = pedidoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const [fornecedor] = await sql`SELECT * FROM fornecedores WHERE id = ${data.fornecedor_id}`;
    if (!fornecedor) {
      return reply.code(400).send({ error: "fornecedor_id não corresponde a um fornecedor existente" });
    }

    const [pedido] = await sql`
      INSERT INTO pedidos (fornecedor_id, numero_referencia, moeda, observacoes)
      VALUES (
        ${data.fornecedor_id}, ${data.numero_referencia ?? null},
        ${data.moeda ?? fornecedor.moeda_padrao}, ${data.observacoes ?? null}
      )
      RETURNING *
    `;
    await semearChecklist(pedido.id as string);
    const checklist = await sql`SELECT * FROM pedido_checklist_itens WHERE pedido_id = ${pedido.id} ORDER BY ordem`;
    return reply.code(201).send({ ...pedido, itens: [], documentos: [], checklist });
  });

  app.put("/pedidos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await sql`SELECT * FROM pedidos WHERE id = ${id}`;
    if (!existing) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    const parsed = pedidoUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const numeroReferencia = data.numero_referencia ?? existing.numero_referencia;
    const status = data.status ?? existing.status;
    const moeda = data.moeda ?? existing.moeda;
    const observacoes = data.observacoes ?? existing.observacoes;

    const [pedido] = await sql`
      UPDATE pedidos SET
        numero_referencia = ${numeroReferencia},
        status = ${status},
        moeda = ${moeda},
        observacoes = ${observacoes},
        atualizado_em = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return pedido;
  });

  app.post("/pedidos/:id/itens", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [pedido] = await sql`SELECT id FROM pedidos WHERE id = ${id}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    const parsed = pedidoItemInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const valorTotal = data.quantidade * data.preco_unitario;

    const [item] = await sql`
      INSERT INTO pedido_itens (
        pedido_id, item_code, sku_interno, descricao, quantidade,
        unidade, preco_unitario, valor_total, atributos_extra
      ) VALUES (
        ${id}, ${data.item_code ?? null}, ${data.sku_interno ?? null}, ${data.descricao},
        ${data.quantidade}, ${data.unidade}, ${data.preco_unitario}, ${valorTotal},
        ${sql.json(asJson(data.atributos_extra))}
      )
      RETURNING *
    `;
    return reply.code(201).send(item);
  });

  app.put("/pedidos/:id/itens/:itemId", async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const [existing] = await sql`SELECT * FROM pedido_itens WHERE id = ${itemId} AND pedido_id = ${id}`;
    if (!existing) {
      return reply.code(404).send({ error: "Item não encontrado" });
    }
    const parsed = pedidoItemUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const itemCode = data.item_code ?? existing.item_code;
    const skuInterno = data.sku_interno ?? existing.sku_interno;
    const descricao = data.descricao ?? existing.descricao;
    const quantidade = data.quantidade ?? existing.quantidade;
    const unidade = data.unidade ?? existing.unidade;
    const precoUnitario = data.preco_unitario ?? existing.preco_unitario;
    const atributosExtra = asJson((data.atributos_extra ?? existing.atributos_extra) as Record<string, unknown>);
    const valorTotal = quantidade * precoUnitario;

    const [item] = await sql`
      UPDATE pedido_itens SET
        item_code = ${itemCode},
        sku_interno = ${skuInterno},
        descricao = ${descricao},
        quantidade = ${quantidade},
        unidade = ${unidade},
        preco_unitario = ${precoUnitario},
        valor_total = ${valorTotal},
        atributos_extra = ${sql.json(atributosExtra)}
      WHERE id = ${itemId}
      RETURNING *
    `;
    return item;
  });

  app.delete("/pedidos/:id/itens/:itemId", async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const [item] = await sql`
      DELETE FROM pedido_itens WHERE id = ${itemId} AND pedido_id = ${id} RETURNING *
    `;
    if (!item) {
      return reply.code(404).send({ error: "Item não encontrado" });
    }
    return reply.code(204).send();
  });
}
