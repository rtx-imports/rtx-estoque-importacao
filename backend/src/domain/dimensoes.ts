/**
 * Width/Length (largura/comprimento, em metros) por SKU — colunas da Decisão de
 * Compra que faltavam desde a decisão 24 do DECISIONS.md.
 *
 * Rolinho: o SKU canônico de 14 chars (MM LLL CCCCCC TTT) já carrega a medida —
 * MM (2 primeiros dígitos) é o comprimento do rolo em metros, TTT (últimos 3,
 * sempre terminando em "C") é a largura em centímetros. Confirmado contra
 * `container.json` do `rtx-pedidos` (mesmos valores, ex. SKU "02105BRABRI50C"
 * -> length 2m, width 0.5m).
 *
 * Placa: o SKU NÃO carrega a medida do mesmo jeito — os últimos 3 chars são um
 * código de dimensão (60C, 77C, 30C, 38C…) que agrupa vários materiais da
 * mesma folha, não a medida em si. `container.json` do `rtx-pedidos` está com
 * width/length ZERADO para toda placa (verificado, não é fonte válida); a
 * medida real vem de `placas-dimensoes.json` (cópia de `placas-depara.json`
 * do rtx-pedidos, 39 SKUs canônicos com widthM/lengthM medidos) — mas esses
 * 39 só cobrem SKUs de peça avulsa (prefixo "30"/"70" = largura em cm).
 *
 * Investigado em 04/09/2026 (TODO "width e length das placas vazio"): das 268
 * placas ativas no catálogo hoje, 229 ficavam sem dimensão. Causa: a maioria
 * ("Kit de 5"/"Kit de 8") usa um SKU de outro dialeto — os 2 primeiros dígitos
 * ali são a QUANTIDADE do kit (ex. "05605PTJBRA38C" = kit de 5), não a
 * largura, então nunca batiam com a tabela. Recuperamos os que dá pra
 * recuperar SEM adivinhar: o restante do SKU (a partir da posição 2) do kit é
 * idêntico ao da peça avulsa correspondente já presente na tabela — é a mesma
 * peça física, só embalada em kit — então casamos por esse "sufixo" antes de
 * desistir (64 dos 229 recuperados assim). NÃO tentamos extrair medida da
 * descrição por regex — isso já foi avaliado e descartado de propósito na
 * decisão 24 (DECISIONS.md): "um width/length errado mostrado como se fosse
 * dado real é pior que '—', Bruno pode pedir tamanho errado". Os ~165
 * restantes (sem par avulso na tabela) continuam null — não há como saber com
 * segurança sem consultar o fornecedor.
 */
import placasDimensoesRaw from "../data/placas-dimensoes.json" with { type: "json" };

export interface Dimensao {
  widthM: number;
  lengthM: number;
}

interface PlacaDeParaEntry {
  widthM: number;
  lengthM: number;
}

const PLACAS: Record<string, PlacaDeParaEntry> = placasDimensoesRaw as Record<string, PlacaDeParaEntry>;

// Índice por "sufixo" (SKU sem os 2 primeiros dígitos) pra casar kit <-> peça
// avulsa que compartilham o mesmo código de linha/cor/tamanho.
const PLACAS_POR_SUFIXO: Record<string, PlacaDeParaEntry> = Object.fromEntries(
  Object.entries(PLACAS).map(([sku, entry]) => [sku.slice(2), entry]),
);

function dimensaoRolinho(sku: string): Dimensao | null {
  if (sku.length !== 14) return null;
  const lengthM = Number.parseInt(sku.slice(0, 2), 10);
  // O "C" final é opcional: confirmado batendo com a descrição de vários produtos
  // (ex. "01105BLKOUT100" = "Adesivo Vinil Blackout 1m x 1m", "02101PREFOS120" =
  // "Adesivo Preto Fosco 2m x 120cm") — mesma convenção de largura em cm, só sem
  // a letra. Sem o "?" aqui, ~130 SKUs reais (de 493) ficavam sem Width/Length.
  const widthMatch = sku.slice(11).match(/^(\d{2,3})C?$/);
  if (!Number.isFinite(lengthM) || lengthM <= 0 || !widthMatch) return null;
  return { lengthM, widthM: Number.parseInt(widthMatch[1], 10) / 100 };
}

function dimensaoPlaca(sku: string): Dimensao | null {
  const direto = PLACAS[sku];
  if (direto) return { widthM: direto.widthM, lengthM: direto.lengthM };
  const porSufixo = PLACAS_POR_SUFIXO[sku.slice(2)];
  if (porSufixo) return { widthM: porSufixo.widthM, lengthM: porSufixo.lengthM };
  return null;
}

/**
 * Dimensão do produto pelo SKU + tipo. null quando não há como saber (não
 * inventa valor). `tipo` é o texto livre de `tipos_produto.nome` — só
 * "rolinho"/"placa" têm regra de derivação; qualquer outro tipo cadastrado
 * fica sem dimensão (não há fórmula pra tipo novo ainda).
 */
export function dimensaoProduto(sku: string, tipo: string | null): Dimensao | null {
  if (tipo === "placa") return dimensaoPlaca(sku);
  if (tipo === "rolinho") return dimensaoRolinho(sku);
  return null;
}
