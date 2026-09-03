import { z } from "zod";

export const TIPOS_DOCUMENTO = [
  "invoice_proforma",
  "invoice_comercial",
  "comprovante_pagamento",
  "packing_list",
  "bl",
  "di",
  "nf_transferencia",
  "outro",
] as const;

export const FASES_DOCUMENTO = [
  "pedido",
  "pagamento_inicial",
  "producao",
  "embarque",
  "desembaraco",
  "transporte",
  "conferencia",
  "pagamento_final",
  "contabilidade",
] as const;

export const pedidoDocumentoFieldsSchema = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO).default("invoice_proforma"),
  fase: z.enum(FASES_DOCUMENTO).default("pedido"),
  observacoes: z.string().min(1).optional(),
});

export type PedidoDocumentoFields = z.infer<typeof pedidoDocumentoFieldsSchema>;
