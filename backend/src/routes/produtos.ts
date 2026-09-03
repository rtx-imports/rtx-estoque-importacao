import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { produtoInputSchema, produtoUpdateSchema } from "../schemas/produto.js";

export async function produtosRoutes(app: FastifyInstance) {
  app.get("/produtos", async (request) => {
    const { fornecedor_id, ativo } = request.query as { fornecedor_id?: string; ativo?: string };
    if (fornecedor_id && (ativo === "true" || ativo === "false")) {
      return sql`
        SELECT * FROM produtos
        WHERE fornecedor_id = ${fornecedor_id} AND ativo = ${ativo === "true"}
        ORDER BY sku
      `;
    }
    if (fornecedor_id) {
      return sql`SELECT * FROM produtos WHERE fornecedor_id = ${fornecedor_id} ORDER BY sku`;
    }
    if (ativo === "true" || ativo === "false") {
      return sql`SELECT * FROM produtos WHERE ativo = ${ativo === "true"} ORDER BY sku`;
    }
    return sql`SELECT * FROM produtos ORDER BY sku`;
  });

  app.get("/produtos/:sku", async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const [produto] = await sql`SELECT * FROM produtos WHERE sku = ${sku}`;
    if (!produto) {
      return reply.code(404).send({ error: "Produto não encontrado" });
    }
    return produto;
  });

  app.post("/produtos", async (request, reply) => {
    const parsed = produtoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.fornecedor_id) {
      const [fornecedor] = await sql`SELECT id FROM fornecedores WHERE id = ${data.fornecedor_id}`;
      if (!fornecedor) {
        return reply.code(400).send({ error: "fornecedor_id não corresponde a um fornecedor existente" });
      }
    }

    const [produto] = await sql`
      INSERT INTO produtos (sku, descricao, fornecedor_id, unidades_por_caixa, custo_unit_usd, ativo)
      VALUES (
        ${data.sku}, ${data.descricao}, ${data.fornecedor_id ?? null},
        ${data.unidades_por_caixa}, ${data.custo_unit_usd}, ${data.ativo}
      )
      RETURNING *
    `;
    return reply.code(201).send(produto);
  });

  app.put("/produtos/:sku", async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const [existing] = await sql`SELECT * FROM produtos WHERE sku = ${sku}`;
    if (!existing) {
      return reply.code(404).send({ error: "Produto não encontrado" });
    }
    const parsed = produtoUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const descricao = data.descricao ?? existing.descricao;
    const fornecedorId = data.fornecedor_id !== undefined ? data.fornecedor_id : existing.fornecedor_id;
    const unidadesPorCaixa = data.unidades_por_caixa ?? existing.unidades_por_caixa;
    const custoUnitUsd = data.custo_unit_usd ?? existing.custo_unit_usd;
    const ativo = data.ativo ?? existing.ativo;

    const [produto] = await sql`
      UPDATE produtos SET
        descricao = ${descricao},
        fornecedor_id = ${fornecedorId},
        unidades_por_caixa = ${unidadesPorCaixa},
        custo_unit_usd = ${custoUnitUsd},
        ativo = ${ativo},
        atualizado_em = now()
      WHERE sku = ${sku}
      RETURNING *
    `;
    return produto;
  });
}
