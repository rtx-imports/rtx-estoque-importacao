import { sql } from "../db.js";
import { envDefaults, mergeParams, type ParamDefaults } from "../config/params.js";
import { planejar } from "../engine/planoCompra.js";
import { demandaPicoMensal } from "../engine/demanda.js";
import { lerVendasMensais } from "../repo/vendasPainel.js";
import { lerInventarioFull } from "../repo/inventarioFull.js";
import { dimensaoProduto } from "./dimensoes.js";
import { custoUnitario } from "./custos.js";
import { classifyAbc, type AbcClass } from "../engine/abc.js";
import { coeficienteVariacao, classificarXyz, type XyzClass } from "../engine/xyz.js";

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
// Do embarque até a desova agendada — pra de contar assim que chega em "armazenado"
// (aí já virou estoque físico de verdade, não é mais "trânsito"). Pipeline real do
// ClickUp, ver schemas/pedido.ts.
const STATUS_EM_TRANSITO = ["embarcado_em_transito", "em_santos", "desembaraco_coleta", "desova_agendada"];

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
  /** Client code (produtos.item_code) — null quando não cadastrado; a
   * grade cai pro `sku` nesse caso (não inventa código). */
  itemCode: string | null;
  /** NCM (produtos.ncm) — agrupa linhas na grade; null = sem grupo. */
  ncm: string | null;
  /** Referencia tipos_produto.nome — cadastro dinâmico, não fica mais restrito a rolinho/placa. */
  tipo: string | null;
  demandaPicoMensal: number;
  /** Estoque físico total (Full + Cross) — mesmo campo editável de sempre. */
  estoque: number;
  /** Unidades em centros de fulfillment (ML Full/Shopee FBS/Amazon FBA), lido do
   * painel-gbw — null quando não há dado pra esse SKU (nunca inventa 0). */
  estoqueFull: number | null;
  /** estoque − estoqueFull (nunca negativo) — "estoque no próprio galpão RTX,
   * fora do Full". null quando estoqueFull também é null (sem como subdividir). */
  estoqueCross: number | null;
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
  /** Dias até a ruptura considerando estoque + trânsito (mesma base do motor de
   * "Acaba Em") — null sem giro. Coluna "Dias restantes" da grade. */
  diasRestantes: number | null;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
  /** Relevância financeira (demanda de pico × custo, USD) — base da Curva ABC. */
  valorFinanceiroUsd: number;
  /** Curva ABC (classifyAbc, Pareto sobre valorFinanceiroUsd de todos os itens do fornecedor). */
  classeAbc: AbcClass;
  /** Coeficiente de variação da série mensal de vendas — null sem histórico suficiente. */
  coefVariacao: number | null;
  /** Curva XYZ (previsibilidade da demanda). */
  classeXyz: XyzClass;
}

export interface PropostaKpis {
  totalSugeridoUsd: number;
  totalSugeridoBrl: number;
  produtosCriticos: number;
  rupturasPrevistas: number;
  saudeEstoquePct: number;
  coberturaMediaDias: number | null;
}

/**
 * Resumo gerencial da Decisão de Compra (painel superior). "Crítico" =
 * mesmo limiar "Revisar" da grade (≤3 meses pra acabar, ver statusLinha no
 * front) — produto cuja projeção indica ruptura antes da próxima reposição.
 * "Ruptura prevista" conta qualquer item com data de ruptura calculada
 * dentro do horizonte de busca do motor (acabaTipo === "mes"), sem/com
 * necessidade automática — sinal mais amplo que "crítico". Saúde do
 * estoque = % de SKUs sem risco de ruptura (não "mes" ou acabaMeses > 3).
 * Cobertura média = média dos dias de estoque físico atual entre os SKUs
 * com giro (diasEstoqueAtual != null) — ignora quem não vende.
 */
export function calcularKpis(itens: PropostaItem[]): PropostaKpis {
  const produtosCriticos = itens.filter((i) => i.acabaTipo === "mes" && (i.acabaMeses ?? 99) <= 3).length;
  const rupturasPrevistas = itens.filter((i) => i.acabaTipo === "mes").length;
  const semRisco = itens.filter((i) => !(i.acabaTipo === "mes" && (i.acabaMeses ?? 99) <= 3)).length;
  const comGiro = itens.filter((i) => i.diasEstoqueAtual != null);
  return {
    totalSugeridoUsd: itens.reduce((acc, i) => acc + i.custoUsd, 0),
    totalSugeridoBrl: itens.reduce((acc, i) => acc + i.custoBrl, 0),
    produtosCriticos,
    rupturasPrevistas,
    saudeEstoquePct: itens.length ? Math.round((semRisco / itens.length) * 100) : 100,
    coberturaMediaDias: comGiro.length
      ? comGiro.reduce((acc, i) => acc + (i.diasEstoqueAtual as number), 0) / comGiro.length
      : null,
  };
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
  /** Sobrescreve parâmetros carregados do banco — usado pela aba Simulações
   * (POST /proposta/simular) pra recalcular sem persistir nada. */
  paramsOverride: Partial<ParamDefaults> = {},
) {
  const params = { ...(await carregarParametros()), ...paramsOverride };
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
  const fullPorSku = await lerInventarioFull();

  const itens: PropostaItem[] = await Promise.all(
    produtos.map(async (produto) => {
      const vendas = await lerVendasMensais(produto.sku, desdeMes);
      const demanda = demandaPicoMensal(vendas);
      const estoque = estoquePorSku.get(produto.sku) ?? 0;
      const transito = transitoPorSku.get(produto.sku) ?? 0;
      const estoqueFull = fullPorSku.get(produto.sku) ?? null;
      const estoqueCross = estoqueFull != null ? Math.max(0, estoque - estoqueFull) : null;
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
      const diasRestantes = demanda > 0 ? (estoque + transito) / (demanda / DIAS_POR_MES) : null;
      const coefVariacao = coeficienteVariacao(vendas.map((v) => v.quantidade));

      return {
        sku: produto.sku as string,
        descricao: produto.descricao as string,
        itemCode: (produto.item_code as string | null) ?? null,
        ncm: (produto.ncm as string | null) ?? null,
        tipo,
        demandaPicoMensal: demanda,
        estoque,
        estoqueFull,
        estoqueCross,
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
        diasRestantes,
        necessidadeAuto,
        necessidade,
        caixas,
        custoUsd,
        custoBrl,
        isOverride: hasOverride,
        valorFinanceiroUsd: demanda * custoUnitUsd,
        classeAbc: "C" as AbcClass, // preenchido abaixo, depois de ter o conjunto inteiro
        coefVariacao,
        classeXyz: classificarXyz(coefVariacao),
      };
    }),
  );

  const classesAbc = classifyAbc(itens.map((i) => ({ key: i.sku, valor: i.valorFinanceiroUsd })));
  for (const item of itens) item.classeAbc = classesAbc.get(item.sku) ?? "C";

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
