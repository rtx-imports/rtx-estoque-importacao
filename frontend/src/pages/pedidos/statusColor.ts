import type { PedidoStatus } from "../../api/types";

/** Cor por status — pipeline real do ClickUp (PDF "ETAPAS IMPORTAÇÃO_CLICK
 * UP"): Cotação/Proposta até Finalizado Financeiro, "Cancelado" à parte.
 * Fonte única — usado no Kanban (coluna) e no seletor de status da página
 * de detalhe do pedido (badge), pra nunca divergir entre os dois lugares. */
export const COR_STATUS: Record<PedidoStatus, { coluna: string; borda: string }> = {
  cotacao_proposta: { coluna: "bg-rose-100 text-rose-700", borda: "border-l-rose-500" },
  prod_iniciada_sem_pgto: { coluna: "bg-orange-100 text-orange-700", borda: "border-l-orange-500" },
  prod_iniciada_pgto_ok: { coluna: "bg-border-rtx text-ink", borda: "border-l-border-rtx-strong" },
  prod_finalizada_pre_embarque: { coluna: "bg-amber-100 text-amber-700", borda: "border-l-amber-500" },
  relatorio_embarques: { coluna: "bg-lime-100 text-lime-700", borda: "border-l-lime-500" },
  embarcado_em_transito: { coluna: "bg-yellow-100 text-yellow-700", borda: "border-l-yellow-500" },
  em_santos: { coluna: "bg-red-100 text-red-700", borda: "border-l-red-500" },
  desembaraco_coleta: { coluna: "bg-info-bg text-info", borda: "border-l-info" },
  desova_agendada: { coluna: "bg-pink-100 text-pink-700", borda: "border-l-pink-500" },
  armazenado: { coluna: "bg-indigo-100 text-indigo-700", borda: "border-l-indigo-500" },
  finalizado_financeiro: { coluna: "bg-emerald-100 text-emerald-700", borda: "border-l-emerald-500" },
  cancelado: { coluna: "bg-paper text-muted-rtx", borda: "border-l-border-rtx-strong" },
};
