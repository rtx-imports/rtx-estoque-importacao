import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type postgres from "postgres";
import { sql } from "../db.js";
import { calcularProposta, precisaAtencao, totalizarProposta } from "../domain/proposta.js";

const gerarPedidoSchema = z.object({
  fornecedor_id: z.string().uuid(),
  overrides: z.record(z.string(), z.number()).default({}),
});

export async function propostaRoutes(app: FastifyInstance) {
  app.get("/proposta", async (request, reply) => {
    const { fornecedor_id } = request.query as { fornecedor_id?: string };
    if (!fornecedor_id) {
      return reply.code(400).send({ error: "fornecedor_id é obrigatório" });
    }
    const [fornecedor] = await sql`SELECT id FROM fornecedores WHERE id = ${fornecedor_id}`;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }

    const { params, itens } = await calcularProposta(fornecedor_id);
    // Só mostra quem precisa de atenção (necessidade > 0 ou estoque atual crítico) —
    // gerar-pedido continua vendo TODOS os itens, ver precisaAtencao().
    const itensVisiveis = itens.filter((item) => precisaAtencao(item, params));
    return { fornecedor_id, params, itens: itensVisiveis, totais: totalizarProposta(itensVisiveis) };
  });

  app.post("/proposta/gerar-pedido", async (request, reply) => {
    const parsed = gerarPedidoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { fornecedor_id, overrides } = parsed.data;
    const [fornecedor] = await sql`SELECT * FROM fornecedores WHERE id = ${fornecedor_id}`;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }

    const { itens } = await calcularProposta(fornecedor_id, overrides);
    const itensComNecessidade = itens.filter((item) => item.necessidade > 0);
    if (itensComNecessidade.length === 0) {
      return reply.code(400).send({ error: "Nenhum produto com necessidade de compra acima de zero" });
    }

    const pedidoId = await sql.begin(async (tx) => {
      const [novoPedido] = await tx`
        INSERT INTO pedidos (fornecedor_id, moeda)
        VALUES (${fornecedor_id}, ${fornecedor.moeda_padrao})
        RETURNING id
      `;
      for (const item of itensComNecessidade) {
        const valorTotal = item.necessidade * item.custoUnitUsd;
        const atributosExtra = {
          sku: item.sku,
          tipo: item.tipo,
          demanda_pico_mensal: item.demandaPicoMensal,
          estoque: item.estoque,
          transito: item.transito,
          origem: "proposta_compra",
        } as postgres.JSONValue;
        await tx`
          INSERT INTO pedido_itens (
            pedido_id, item_code, descricao, quantidade, unidade,
            preco_unitario, valor_total, atributos_extra
          ) VALUES (
            ${novoPedido.id}, ${item.sku}, ${item.descricao}, ${item.necessidade}, 'un',
            ${item.custoUnitUsd}, ${valorTotal}, ${tx.json(atributosExtra)}
          )
        `;
      }
      return novoPedido.id as string;
    });

    const [pedido] = await sql`SELECT * FROM pedidos WHERE id = ${pedidoId}`;
    const itensPedido = await sql`SELECT * FROM pedido_itens WHERE pedido_id = ${pedidoId} ORDER BY criado_em`;
    return reply.code(201).send({ ...pedido, itens: itensPedido, documentos: [] });
  });
}
