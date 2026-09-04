/**
 * Classificação ABC por Pareto sobre a participação ACUMULADA do valor
 * financeiro (demanda × custo). Portado do `rtx-pedidos`
 * (src/engine/abc.ts) — mesma matemática, mesmos limiares:
 *   ≤70% => A
 *   ≤90% => B
 *   resto => C
 * O acumulado inclui o próprio item corrente (curva de Pareto clássica).
 */

export type AbcClass = "A" | "B" | "C";

export interface AbcItem {
  key: string;
  valor: number;
}

export function classifyAbc(items: AbcItem[]): Map<string, AbcClass> {
  const out = new Map<string, AbcClass>();
  if (items.length === 0) return out;

  const total = items.reduce((acc, it) => acc + Math.max(0, it.valor), 0);
  if (total <= 0) {
    for (const it of items) out.set(it.key, "C");
    return out;
  }

  const sorted = [...items].sort((a, b) => b.valor - a.valor);
  let acc = 0;
  for (const it of sorted) {
    acc += Math.max(0, it.valor);
    const cum = acc / total;
    out.set(it.key, cum <= 0.7 ? "A" : cum <= 0.9 ? "B" : "C");
  }
  return out;
}
