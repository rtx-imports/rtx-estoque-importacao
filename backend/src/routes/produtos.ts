import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { classificarTipoPorSku } from "../domain/skuTipo.js";
import { custoUnitario } from "../domain/custos.js";
import {
  buscarCatalogoCompletoTiny,
  buscarEstoqueTiny,
  PAUSA_ENTRE_PAGINAS_MS,
  TinyNaoConfiguradoError,
} from "../repo/tinyProdutos.js";
import { produtoInputSchema, produtoUpdateSchema } from "../schemas/produto.js";

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Junta o produto com o estoque atual (0 quando o SKU nunca teve linha em `estoque`). */
const SELECT_COM_ESTOQUE = sql`
  SELECT produtos.*, COALESCE(estoque.quantidade, 0) AS estoque
  FROM produtos
  LEFT JOIN estoque ON estoque.sku = produtos.sku
`;

export async function produtosRoutes(app: FastifyInstance) {
  app.get("/produtos", async (request) => {
    const { tipo, ativo } = request.query as { tipo?: string; ativo?: string };
    if (tipo && (ativo === "true" || ativo === "false")) {
      return sql`${SELECT_COM_ESTOQUE} WHERE produtos.tipo = ${tipo} AND produtos.ativo = ${ativo === "true"} ORDER BY produtos.sku`;
    }
    if (tipo) {
      return sql`${SELECT_COM_ESTOQUE} WHERE produtos.tipo = ${tipo} ORDER BY produtos.sku`;
    }
    if (ativo === "true" || ativo === "false") {
      return sql`${SELECT_COM_ESTOQUE} WHERE produtos.ativo = ${ativo === "true"} ORDER BY produtos.sku`;
    }
    return sql`${SELECT_COM_ESTOQUE} ORDER BY produtos.sku`;
  });

  app.get("/produtos/:sku", async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const [produto] = await sql`${SELECT_COM_ESTOQUE} WHERE produtos.sku = ${sku}`;
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
    const tipo = data.tipo !== undefined ? data.tipo : classificarTipoPorSku(data.sku);

    const [produto] = await sql`
      INSERT INTO produtos (sku, descricao, unidades_por_caixa, custo_unit_usd, ativo, tipo)
      VALUES (${data.sku}, ${data.descricao}, ${data.unidades_por_caixa}, ${data.custo_unit_usd}, ${data.ativo}, ${tipo})
      RETURNING *
    `;
    return reply.code(201).send(produto);
  });

  app.post("/produtos/importar-tiny-catalogo", async (_request, reply) => {
    try {
      const { totalNoTiny, classificados } = await buscarCatalogoCompletoTiny();

      const skus = classificados.map((p) => p.sku);
      const existentesRows = skus.length ? await sql`SELECT sku FROM produtos WHERE sku = ANY(${skus})` : [];
      const existentes = new Set(existentesRows.map((r) => r.sku as string));
      const novos = classificados.filter((p) => !existentes.has(p.sku));

      for (const p of novos) {
        const custoSugerido = custoUnitario(p.sku, p.tipoSugerido, "atual") ?? 0;
        await sql`
          INSERT INTO produtos (sku, descricao, tipo, custo_unit_usd)
          VALUES (${p.sku}, ${p.nome}, ${p.tipoSugerido}, ${custoSugerido})
        `;
      }

      // Estoque (pedido de Beatriz: "puxe o estoque no tiny na sincronização
      // também") — sugestão a cada sync, continua editável na tela depois
      // (ver DECISIONS.md). Best-effort por SKU: um produto sem estoque
      // legível no Tiny não derruba a sincronização inteira.
      let estoqueAtualizado = 0;
      for (const p of classificados) {
        try {
          const quantidade = await buscarEstoqueTiny(p.tinyId);
          await sql`
            INSERT INTO estoque (sku, quantidade, atualizado_em)
            VALUES (${p.sku}, ${quantidade}, now())
            ON CONFLICT (sku) DO UPDATE SET quantidade = ${quantidade}, atualizado_em = now()
          `;
          estoqueAtualizado++;
        } catch {
          // segue pro próximo SKU — não trava a sincronização inteira.
        }
        await aguardar(PAUSA_ENTRE_PAGINAS_MS);
      }

      // Custo (pedido de Beatriz: "preencher os custos de cada produto") —
      // só backfill de quem ainda está em 0 (não pisa em custo já ajustado
      // na mão), usando a tabela de custos já portada do rtx-pedidos.
      const semCusto = await sql<{ sku: string; tipo: string | null }[]>`
        SELECT sku, tipo FROM produtos WHERE custo_unit_usd = 0 AND tipo IS NOT NULL
      `;
      let custoPreenchido = 0;
      for (const produto of semCusto) {
        const custo = custoUnitario(produto.sku, produto.tipo, "atual");
        if (custo != null && custo > 0) {
          await sql`UPDATE produtos SET custo_unit_usd = ${custo}, atualizado_em = now() WHERE sku = ${produto.sku}`;
          custoPreenchido++;
        }
      }

      return reply.code(201).send({
        totalNoTiny,
        classificados: classificados.length,
        naoClassificados: totalNoTiny - classificados.length,
        importados: novos.length,
        jaExistiam: existentes.size,
        estoqueAtualizado,
        custoPreenchido,
      });
    } catch (error) {
      if (error instanceof TinyNaoConfiguradoError) {
        return reply.code(503).send({ error: "Integração com o Tiny não configurada" });
      }
      app.log.error(error);
      return reply.code(502).send({ error: "Falha ao importar catálogo do Tiny" });
    }
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
    const unidadesPorCaixa = data.unidades_por_caixa ?? existing.unidades_por_caixa;
    const custoUnitUsd = data.custo_unit_usd ?? existing.custo_unit_usd;
    const ativo = data.ativo ?? existing.ativo;
    const tipo = data.tipo !== undefined ? data.tipo : existing.tipo;

    const [produto] = await sql`
      UPDATE produtos SET
        descricao = ${descricao},
        unidades_por_caixa = ${unidadesPorCaixa},
        custo_unit_usd = ${custoUnitUsd},
        ativo = ${ativo},
        tipo = ${tipo},
        atualizado_em = now()
      WHERE sku = ${sku}
      RETURNING *
    `;
    return produto;
  });
}
