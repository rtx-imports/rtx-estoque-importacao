import { sql } from "../db.js";
import { envDefaults, mergeParams } from "../config/params.js";
import { calcReorder } from "../engine/reorder.js";
import { demandaPicoMensal } from "../engine/demanda.js";
import { lerVendasMensais } from "../repo/vendasPainel.js";

function mesesAtras(n: number): string {
  const data = new Date();
  data.setUTCMonth(data.getUTCMonth() - n);
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function carregarParametros() {
  const rows = await sql<{ chave: string; valor: string }[]>`SELECT chave, valor FROM parametros`;
  return mergeParams(envDefaults(), rows);
}

export interface PropostaItem {
  sku: string;
  descricao: string;
  demandaPicoMensal: number;
  estoque: number;
  transito: number;
  unidadesPorCaixa: number;
  custoUnitUsd: number;
  demandaDiaria: number;
  coberturaTotalDias: number;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
}

/**
 * Calcula a proposta de compra de um fornecedor: para cada produto ativo
 * dele, junta venda (lida do painel-gbw), estoque e em-trânsito (manuais) e
 * aplica o motor de reposição. `overrides` (sku -> quantidade) sobrescreve a
 * necessidade automática de um produto específico — mesma função tanto para
 * a tela quanto para gerar o pedido, pra nunca divergir.
 */
export async function calcularProposta(
  fornecedorId: string,
  overrides: Record<string, number> = {},
) {
  const params = await carregarParametros();
  const desdeMes = mesesAtras(params.janelaMeses);

  const produtos = await sql`
    SELECT * FROM produtos WHERE fornecedor_id = ${fornecedorId} AND ativo = true ORDER BY sku
  `;
  const estoqueRows = await sql`SELECT sku, quantidade FROM estoque`;
  const transitoRows = await sql`SELECT sku, quantidade FROM em_transito`;
  const estoquePorSku = new Map(estoqueRows.map((r) => [r.sku as string, Number(r.quantidade)]));
  const transitoPorSku = new Map(transitoRows.map((r) => [r.sku as string, Number(r.quantidade)]));

  const itens: PropostaItem[] = await Promise.all(
    produtos.map(async (produto) => {
      const vendas = await lerVendasMensais(produto.sku, desdeMes);
      const demanda = demandaPicoMensal(vendas);
      const estoque = estoquePorSku.get(produto.sku) ?? 0;
      const transito = transitoPorSku.get(produto.sku) ?? 0;
      const unidadesPorCaixa = Number(produto.unidades_por_caixa);
      const custoUnitUsd = Number(produto.custo_unit_usd);
      const calc = calcReorder(
        { demandaPicoMensal: demanda, estoque, transito, unidadesPorCaixa, custoUnitUsd },
        params,
        overrides[produto.sku],
      );
      return {
        sku: produto.sku as string,
        descricao: produto.descricao as string,
        demandaPicoMensal: demanda,
        estoque,
        transito,
        unidadesPorCaixa,
        custoUnitUsd,
        ...calc,
      };
    }),
  );

  return { params, itens };
}

export function totalizarProposta(itens: PropostaItem[]) {
  return itens.reduce(
    (acc, item) => ({
      necessidade: acc.necessidade + item.necessidade,
      custoUsd: acc.custoUsd + item.custoUsd,
      custoBrl: acc.custoBrl + item.custoBrl,
    }),
    { necessidade: 0, custoUsd: 0, custoBrl: 0 },
  );
}
