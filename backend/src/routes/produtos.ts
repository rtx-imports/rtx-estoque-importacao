import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { classificarTipoPorSku } from "../domain/skuTipo.js";
import { custoUnitario } from "../domain/custos.js";
import { sincronizarLoteEstoque } from "../domain/estoqueSync.js";
import { buscarCatalogoCompletoTiny, TinyNaoConfiguradoError } from "../repo/tinyProdutos.js";
import { produtoInputSchema, produtoUpdateSchema } from "../schemas/produto.js";

/** Junta o produto com o estoque atual. `estoque` vem NULL (não 0) quando o SKU
 * nunca teve linha na tabela `estoque` — nunca foi sincronizado com o Tiny ainda,
 * distinto de "sincronizado e confirmado zero". Antes isso vinha achatado em 0
 * pelo COALESCE, o que escondia sincronizações incompletas (ver histórico: só
 * uma fração do catálogo chegou a ser consultada numa rodada anterior). */
const SELECT_COM_ESTOQUE = sql`
  SELECT produtos.*, estoque.quantidade AS estoque
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
      INSERT INTO produtos (sku, descricao, unidades_por_caixa, custo_unit_usd, ativo, tipo, item_code, ncm)
      VALUES (
        ${data.sku}, ${data.descricao}, ${data.unidades_por_caixa}, ${data.custo_unit_usd}, ${data.ativo}, ${tipo},
        ${data.item_code ?? null}, ${data.ncm ?? null}
      )
      RETURNING *
    `;
    return reply.code(201).send(produto);
  });

  /**
   * Importa o catálogo (rápido: só pagina a busca do Tiny e grava produtos —
   * sem chamada de estoque por SKU). O estoque NÃO é mais puxado aqui: com
   * milhares de SKUs, uma chamada de estoque por produto (+ pausa de rate
   * limit) numa única requisição HTTP levava dezenas de minutos, arriscando
   * timeout de proxy no meio do caminho e falhando sem deixar claro quanto
   * já tinha sido feito. Ver `POST /produtos/sincronizar-estoque` — endpoint
   * em lotes, chamado repetidamente pelo front com barra de progresso.
   */
  app.post("/produtos/importar-tiny-catalogo", async (_request, reply) => {
    try {
      const { totalNoTiny, classificados } = await buscarCatalogoCompletoTiny();

      const skus = classificados.map((p) => p.sku);
      const existentesRows = skus.length
        ? await sql<{ sku: string; tiny_id: string | null }[]>`SELECT sku, tiny_id FROM produtos WHERE sku = ANY(${skus})`
        : [];
      const existentes = new Map(existentesRows.map((r) => [r.sku, r.tiny_id]));
      const novos = classificados.filter((p) => !existentes.has(p.sku));

      for (const p of novos) {
        const custoSugerido = custoUnitario(p.sku, p.tipoSugerido, "atual") ?? 0;
        await sql`
          INSERT INTO produtos (sku, descricao, tipo, custo_unit_usd, tiny_id)
          VALUES (${p.sku}, ${p.nome}, ${p.tipoSugerido}, ${custoSugerido}, ${p.tinyId})
        `;
      }

      // Backfill de tiny_id em produtos que já existiam sem esse campo (cadastro
      // manual, ou importados antes desta coluna existir) — sem isso, o produto
      // nunca entraria no lote de sincronização de estoque.
      let tinyIdPreenchido = 0;
      for (const p of classificados) {
        if (existentes.has(p.sku) && !existentes.get(p.sku)) {
          await sql`UPDATE produtos SET tiny_id = ${p.tinyId} WHERE sku = ${p.sku}`;
          tinyIdPreenchido++;
        }
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
        tinyIdPreenchido,
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

  // 50 × pausa de 1100ms entre chamadas (tinyProdutos.ts) ≈ 55-60s por lote — margem
  // segura sob timeouts de proxy típicos em produção (Railway/nginx costumam cortar
  // em 60-120s); 100 itens levaria ~110s e arriscaria estourar isso.
  const LOTE_ESTOQUE = 50;

  /**
   * Sincroniza estoque em lotes (não mais dentro do import de catálogo, ver
   * comentário acima). Cursor por SKU (ordem estável) — o front chama de
   * novo com `cursor` até `proximoCursor` vir null. Cada lote é uma
   * requisição HTTP curta (≤50 produtos × ~pausa de rate limit), então não
   * arrisca timeout mesmo sincronizando o catálogo inteiro aos poucos. Além
   * deste botão manual, existe um job automático em background
   * (`jobs/estoqueAutosync.ts`) que roda sozinho a cada alguns minutos —
   * este endpoint é só pra forçar/acompanhar uma rodada na hora.
   */
  app.post("/produtos/sincronizar-estoque", async (request, reply) => {
    const { cursor } = (request.body ?? {}) as { cursor?: string };
    if (!process.env.TINY_TOKEN_RTX) {
      return reply.code(503).send({ error: "Integração com o Tiny não configurada" });
    }

    const produtos = await sql<{ sku: string; tiny_id: string }[]>`
      SELECT sku, tiny_id FROM produtos
      WHERE tiny_id IS NOT NULL AND sku > ${cursor ?? ""}
      ORDER BY sku
      LIMIT ${LOTE_ESTOQUE}
    `;

    let resultado;
    try {
      resultado = await sincronizarLoteEstoque(produtos);
    } catch (error) {
      if (error instanceof TinyNaoConfiguradoError) {
        return reply.code(503).send({ error: "Integração com o Tiny não configurada" });
      }
      throw error;
    }
    const { processados, atualizados, falhas, bloqueado } = resultado;

    const [{ total }] = await sql<{ total: string }[]>`SELECT count(*) AS total FROM produtos WHERE tiny_id IS NOT NULL`;
    // Se bloqueou, o próximo cursor aponta pro item ANTES do que travou, pra
    // retomar exatamente dele (não foi processado) — se travou logo no
    // primeiro item do lote, volta pro cursor recebido (reprocessa o lote
    // inteiro do mesmo ponto).
    let proximoCursor: string | null;
    if (bloqueado) {
      proximoCursor = processados > 0 ? produtos[processados - 1].sku : cursor ?? "";
    } else if (processados === LOTE_ESTOQUE) {
      proximoCursor = produtos[processados - 1].sku;
    } else {
      proximoCursor = null;
    }

    return { processados, atualizados, falhas, bloqueado, proximoCursor, totalElegiveis: Number(total) };
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
    const itemCode = data.item_code !== undefined ? data.item_code : existing.item_code;
    const ncm = data.ncm !== undefined ? data.ncm : existing.ncm;

    const [produto] = await sql`
      UPDATE produtos SET
        descricao = ${descricao},
        unidades_por_caixa = ${unidadesPorCaixa},
        custo_unit_usd = ${custoUnitUsd},
        ativo = ${ativo},
        tipo = ${tipo},
        item_code = ${itemCode},
        ncm = ${ncm},
        atualizado_em = now()
      WHERE sku = ${sku}
      RETURNING *
    `;
    return produto;
  });
}
