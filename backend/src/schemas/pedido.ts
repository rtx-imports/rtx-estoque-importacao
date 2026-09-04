import { z } from "zod";

/**
 * Pipeline real do ClickUp da RTX (não mais um enum "inventado" do MVP) —
 * ver PDFs "ETAPAS IMPORTAÇÃO_CLICK UP" e "MATRIZ_CHECK LIST ATUALIZADO".
 * "cancelado" não está no ClickUp mas é necessário operacionalmente.
 */
export const PEDIDO_STATUS = [
  "cotacao_proposta",
  "prod_iniciada_sem_pgto",
  "prod_iniciada_pgto_ok",
  "prod_finalizada_pre_embarque",
  "relatorio_embarques",
  "embarcado_em_transito",
  "em_santos",
  "desembaraco_coleta",
  "desova_agendada",
  "armazenado",
  "finalizado_financeiro",
  "cancelado",
] as const;

export const pedidoInputSchema = z.object({
  fornecedor_id: z.string().uuid(),
  numero_referencia: z.string().min(1).optional(),
  moeda: z.string().length(3).optional(),
  observacoes: z.string().optional(),
});

export const pedidoUpdateSchema = z.object({
  numero_referencia: z.string().min(1).optional(),
  status: z.enum(PEDIDO_STATUS).optional(),
  moeda: z.string().length(3).optional(),
  observacoes: z.string().optional(),
});

export type PedidoInput = z.infer<typeof pedidoInputSchema>;
export type PedidoUpdate = z.infer<typeof pedidoUpdateSchema>;
