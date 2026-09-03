/**
 * Reduz a série de vendas mensais de um SKU a uma "demanda pico mensal" —
 * insumo do motor de reposição (reorder.ts). Só a estratégia `pico` (default
 * já usado em produção) entra na primeira versão — média e média móvel ficam
 * para depois (DECISIONS.md, decisão 16).
 */

export interface VendaMes {
  mes: string; // "YYYY-MM"
  quantidade: number;
}

export function demandaPicoMensal(vendas: VendaMes[]): number {
  if (vendas.length === 0) return 0;
  return Math.max(...vendas.map((v) => v.quantidade));
}
