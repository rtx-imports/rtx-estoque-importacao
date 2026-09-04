import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type postgres from "postgres";
import { sql } from "../db.js";
import { calcularKpis, calcularProposta, precisaAtencao, totalizarProposta } from "../domain/proposta.js";
import { gerarPlanilhaPedido } from "../xlsx/pedidoExport.js";

const gerarPedidoSchema = z.object({
  fornecedor_id: z.string().uuid(),
  overrides: z.record(z.string(), z.number()).default({}),
});

const simularSchema = z.object({
  fornecedor_id: z.string().uuid(),
  overrides: z.record(z.string(), z.number()).default({}),
  parametros: z
    .object({
      leadTimeDias: z.number().positive().optional(),
      coberturaMinimaMeses: z.number().positive().optional(),
      crescimentoMensal: z.number().positive().optional(),
      cambio: z.number().positive().optional(),
      janelaMeses: z.number().positive().optional(),
      estoqueCriticoDias: z.number().positive().optional(),
    })
    .default({}),
});

const exportarSchema = z.object({
  fornecedor_id: z.string().uuid(),
  itens: z
    .array(z.object({ sku: z.string().min(1), quantidade: z.number().nonnegative() }))
    .min(1),
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
    // Grade principal só mostra quem precisa de atenção (necessidade > 0 ou estoque
    // atual crítico) — gerar-pedido continua vendo TODOS os itens, ver precisaAtencao().
    // `itensTodos` (catálogo inteiro do fornecedor, inclusive quem não precisa comprar
    // agora) alimenta as abas Curva ABC/XYZ, que classificam por relevância financeira e
    // previsibilidade de demanda — não só quem está com necessidade de compra hoje.
    const itensVisiveis = itens.filter((item) => precisaAtencao(item, params));
    return {
      fornecedor_id,
      params,
      itens: itensVisiveis,
      itensTodos: itens,
      totais: totalizarProposta(itensVisiveis),
      // KPIs sobre o catálogo INTEIRO (itens), não só quem já foi filtrado como
      // "precisa de atenção" — senão "saúde do estoque" e "cobertura média" saem
      // quase sempre péssimas por definição (o grupo já filtrado é o grupo dos
      // problemáticos, então medir "saúde" dentro dele é tautológico).
      kpis: calcularKpis(itens),
    };
  });

  // Aba Simulações: recalcula a proposta com parâmetros hipotéticos (câmbio, lead
  // time, crescimento, janela) sem gravar nada — mesmo cálculo do GET /proposta,
  // só troca a fonte dos parâmetros.
  app.post("/proposta/simular", async (request, reply) => {
    const parsed = simularSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { fornecedor_id, overrides, parametros } = parsed.data;
    const [fornecedor] = await sql`SELECT id FROM fornecedores WHERE id = ${fornecedor_id}`;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }

    const { params, itens } = await calcularProposta(fornecedor_id, overrides, parametros);
    const itensVisiveis = itens.filter((item) => precisaAtencao(item, params));
    return {
      fornecedor_id,
      params,
      itens: itensVisiveis,
      itensTodos: itens,
      totais: totalizarProposta(itensVisiveis),
      kpis: calcularKpis(itens),
    };
  });

  // Exportação central do fluxo: gera a planilha no padrão RTX pra enviar ao
  // fornecedor, a partir das quantidades ESCOLHIDAS pelo usuário na tela (podem
  // divergir da sugestão automática). Não cria pedido nem grava nada — só o arquivo.
  app.post("/proposta/exportar", async (request, reply) => {
    const parsed = exportarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { fornecedor_id, itens: itensEscolhidos } = parsed.data;
    const [fornecedor] = await sql`SELECT * FROM fornecedores WHERE id = ${fornecedor_id}`;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }

    const quantidadePorSku = new Map(itensEscolhidos.map((i) => [i.sku, i.quantidade]));
    const { itens } = await calcularProposta(
      fornecedor_id,
      Object.fromEntries(itensEscolhidos.map((i) => [i.sku, i.quantidade])),
    );
    const itensSelecionados = itens.filter((item) => quantidadePorSku.has(item.sku));

    const buffer = await gerarPlanilhaPedido(fornecedor.nome as string, itensSelecionados);
    const nomeArquivo = `pedido_${(fornecedor.nome as string).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
    return reply.send(buffer);
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
