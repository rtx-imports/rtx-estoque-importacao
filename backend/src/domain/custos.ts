/**
 * Resolve o custo unitário de um SKU num tier (full/atual/transito),
 * combinando custo direto (custos.json) com a derivação por dimensão de
 * placa (placasDim) — mesma regra do `rtx-pedidos`. Sem fallback pra
 * `custo_unit_usd` aqui: quem chama decide (ver domain/proposta.ts), porque
 * só ele sabe se um custo ausente deve usar o manual ou virar "—".
 */
import { lerCustos, lerPlacasDim, type Tier } from "../repo/custos.js";

const custosPorSku = lerCustos();
const custosPorDimensaoPlaca = lerPlacasDim();

function dimensaoPlaca(sku: string): string {
  return sku.slice(-3);
}

/** Custo unitário direto ou derivado por dimensão (só placa); undefined se não há dado nenhum. */
export function custoUnitario(sku: string, tipo: string | null, tier: Tier): number | undefined {
  const direto = custosPorSku.get(sku)?.[tier];
  if (direto != null) return direto;
  if (tipo === "placa") return custosPorDimensaoPlaca.get(dimensaoPlaca(sku))?.[tier];
  return undefined;
}
