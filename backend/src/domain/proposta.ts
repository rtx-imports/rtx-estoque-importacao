import { sql } from "../db.js";
import { envDefaults, mergeParams, type ParamDefaults } from "../config/params.js";
import { planejar } from "../engine/planoCompra.js";
import { demandaPicoMensal } from "../engine/demanda.js";
import { lerVendasMensais } from "../repo/vendasPainel.js";
import { dimensaoProduto } from "./dimensoes.js";
import { custoUnitario } from "./custos.js";

const DIAS_POR_MES = 30;

function mesesAtras(n: number): string {
  const data = new Date();
  data.setUTCMonth(data.getUTCMonth() - n);
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * "Em trânsito" não é mais digitado — é derivado dos próprios pedidos
 * (soma dos itens de pedidos que já saíram do fornecedor mas ainda não
 * viraram estoque físico). Menos digitação manual, menos chance de erro.
 */
const STATUS_EM_TRANSITO = ["embarcado", "aguardando_desembaraco", "em_desova", "conferencia"];

async function lerTransitoDosPedidos(): Promise<Map<string, number>> {
  const rows = await sql<{ sku: string; quantidade: number }[]>`
    SELECT pedido_itens.item_code AS sku, SUM(pedido_itens.quantidade) AS quantidade
    FROM pedido_itens
    JOIN pedidos ON pedidos.id = pedido_itens.pedido_id
    WHERE pedidos.status = ANY(${STATUS_EM_TRANSITO}) AND pedido_itens.item_code IS NOT NULL
    GROUP BY pedido_itens.item_code
  `;
  return new Map(rows.map((r) => [r.sku, Number(r.quantidade)]));
}

export async function carregarParametros() {
  const rows = await sql<{ chave: string; valor: string }[]>`SELECT chave, valor FROM parametros`;
  return mergeParams(envDefaults(), rows);
}

export interface PropostaItem {
  sku: string;
  descricao: string;
  /** Referencia tipos_produto.nome — cadastro dinâmico, não fica mais restrito a rolinho/placa. */
  tipo: string | null;
  demandaPicoMensal: number;
  estoque: number;
  transito: number;
  unidadesPorCaixa: number;
  custoUnitUsd: number;
  /** Custo/unidade do tier "atual" (custos.json) — cai pra custoUnitUsd (manual) sem dado direto/derivado. */
  custoAtualUsd: number;
  /** Custo/unidade do tier "transito" (custos.json) — mesmo fallback. */
  custoTransitoUsd: number;
  /** Metros — null quando não há como derivar (placa fora da tabela de-para). */
  widthM: number | null;
  lengthM: number | null;
  /** Plano de compra dos próximos HORIZONTE (7) meses — índice 0 = mês atual. */
  plan: number[];
  acabaMeses: number | null;
  acabaTipo: "mes" | "semgiro" | "acima12";
  /** Dias de venda que o estoque FÍSICO atual cobre — null sem giro (não dá pra medir cobertura). */
  diasEstoqueAtual: number | null;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
}

/**
 * Calcula a proposta de compra de um fornecedor: para cada produto ativo do
 * **tipo** que esse fornecedor costuma vender (`tipo_produto_padrao`,
 * decisão 20 — produto não pertence a um fornecedor fixo, decisão 22),
 * junta venda (lida do painel-gbw), estoque (manual, por enquanto) e
 * em-trânsito (derivado dos pedidos, automático) e aplica o motor de
 * planejamento (planoCompra.ts, portado do rtx-pedidos). `necessidade` (o
 * que vira pedido agora) é o mês 0 do plano. `overrides` (sku -> quantidade)
 * sobrescreve a necessidade automática de um produto específico — mesma
 * função tanto para a tela quanto para gerar o pedido, pra nunca divergir.
 */
export async function calcularProposta(
  fornecedorId: string,
  overrides: Record<string, number> = {},
) {
  const params = await carregarParametros();
  const desdeMes = mesesAtras(params.janelaMeses);
  const planoParams = {
    g: params.crescimentoMensal,
    L: params.leadTimeDias / DIAS_POR_MES,
    M: params.coberturaMinimaMeses,
  };

  const produtos = await sql`
    SELECT produtos.* FROM produtos
    JOIN fornecedor_tipos_produto ftp ON ftp.tipo_produto = produtos.tipo
    WHERE ftp.fornecedor_id = ${fornecedorId} AND produtos.ativo = true
    ORDER BY produtos.sku
  `;
  const estoqueRows = await sql`SELECT sku, quantidade FROM estoque`;
  const estoquePorSku = new Map(estoqueRows.map((r) => [r.sku as string, Number(r.quantidade)]));
  const transitoPorSku = await lerTransitoDosPedidos();

  const itens: PropostaItem[] = await Promise.all(
    produtos.map(async (produto) => {
      const vendas = await lerVendasMensais(produto.sku, desdeMes);
      const demanda = demandaPicoMensal(vendas);
      const estoque = estoquePorSku.get(produto.sku) ?? 0;
      const transito = transitoPorSku.get(produto.sku) ?? 0;
      const unidadesPorCaixa = Number(produto.unidades_por_caixa);
      const custoUnitUsd = Number(produto.custo_unit_usd);
      const tipo = produto.tipo as string | null;
      const custoAtualUsd = custoUnitario(produto.sku as string, tipo, "atual") ?? custoUnitUsd;
      const custoTransitoUsd = custoUnitario(produto.sku as string, tipo, "transito") ?? custoUnitUsd;
      const dimensao = dimensaoProduto(produto.sku as string, tipo);

      const { plan, acabaMeses, acabaTipo } = planejar(demanda, estoque, transito, planoParams);
      const necessidadeAuto = plan[0];
      const override = overrides[produto.sku];
      const hasOverride = override !== undefined && override !== null && !Number.isNaN(override);
      const necessidade = hasOverride ? Math.max(0, Math.round(override)) : necessidadeAuto;
      const caixas = necessidade > 0 ? Math.ceil(necessidade / unidadesPorCaixa) : 0;
      const custoUsd = necessidade * custoUnitUsd;
      const custoBrl = custoUsd * params.cambio;
      const diasEstoqueAtual = demanda > 0 ? estoque / (demanda / DIAS_POR_MES) : null;

      return {
        sku: produto.sku as string,
        descricao: produto.descricao as string,
        tipo,
        demandaPicoMensal: demanda,
        estoque,
        transito,
        unidadesPorCaixa,
        custoUnitUsd,
        custoAtualUsd,
        custoTransitoUsd,
        widthM: dimensao?.widthM ?? null,
        lengthM: dimensao?.lengthM ?? null,
        plan,
        acabaMeses,
        acabaTipo,
        diasEstoqueAtual,
        necessidadeAuto,
        necessidade,
        caixas,
        custoUsd,
        custoBrl,
        isOverride: hasOverride,
      };
    }),
  );

  return { params, itens };
}

/**
 * Decisão de Compra só deve MOSTRAR quem precisa de atenção — o produto não
 * pertence à tela quando não há nem necessidade de pedir nem alerta de
 * estoque baixo. Critério (combinado por OU): motor já mandou pedir este mês
 * (`necessidadeAuto > 0`, que já embute cobertura mínima + lead time +
 * crescimento) OU o estoque FÍSICO atual está abaixo do piso de dias
 * configurado (`estoqueCriticoDias`) — alarme extra pro caso do Full/trânsito
 * mascararem um problema no galpão que o plano ainda não capturou. Separado
 * de `calcularProposta` (que sempre devolve TODOS os produtos do fornecedor,
 * inclusive pra permitir `gerar-pedido` de um SKU fora da lista visível via
 * override) — é só um filtro de exibição, aplicado pela rota GET /proposta.
 */
export function precisaAtencao(item: PropostaItem, params: ParamDefaults): boolean {
  return (
    item.necessidadeAuto > 0 ||
    (item.diasEstoqueAtual != null && item.diasEstoqueAtual < params.estoqueCriticoDias)
  );
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
