/**
 * Referência de câmbio (PTAX do Banco Central) — API pública, sem token.
 * O câmbio usado no cálculo de compra continua manual (cotação comercial
 * comparada entre Santander e Banco do Brasil, decisão de Beatriz — o PTAX
 * não reflete essa cotação de banco), então este módulo só serve como
 * referência ao lado do campo manual, nunca sobrescreve o valor sozinho.
 * Tolerante: se o BCB estiver fora do ar, devolve null em vez de quebrar a
 * tela de parâmetros (mesmo princípio de vendasPainel.ts).
 */

export interface PtaxReferencia {
  valor: number;
  data: string; // "YYYY-MM-DD"
}

const CACHE_MS = 6 * 60 * 60 * 1000; // 6h — é só uma referência do dia, não precisa ser ao vivo
let cache: { at: number; valor: PtaxReferencia | null } | undefined;

export function _resetCachePtaxParaTeste() {
  cache = undefined;
}

async function buscarPtaxNoBcb(): Promise<PtaxReferencia | null> {
  try {
    const res = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/5?formato=json");
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: string; valor: string }[];
    const ultimo = rows.at(-1);
    if (!ultimo) return null;
    const [dia, mes, ano] = ultimo.data.split("/");
    const valor = Number(ultimo.valor);
    if (!Number.isFinite(valor)) return null;
    return { valor, data: `${ano}-${mes}-${dia}` };
  } catch {
    return null;
  }
}

export async function lerPtaxReferencia(): Promise<PtaxReferencia | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.valor;
  const valor = await buscarPtaxNoBcb();
  cache = { at: Date.now(), valor };
  return valor;
}
