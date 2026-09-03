import { z } from "zod";

export const PEDIDO_STATUS = [
  "rascunho",
  "enviado_fornecedor",
  "aguardando_pagamento_inicial",
  "em_producao",
  "embarcado",
  "aguardando_desembaraco",
  "em_desova",
  "conferencia",
  "finalizado",
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
