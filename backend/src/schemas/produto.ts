import { z } from "zod";

const produtoObjectSchema = z.object({
  sku: z.string().min(1),
  descricao: z.string().default(""),
  fornecedor_id: z.string().uuid().nullable().optional(),
  unidades_por_caixa: z.number().positive().default(1),
  custo_unit_usd: z.number().nonnegative().default(0),
  ativo: z.boolean().default(true),
});

export const produtoInputSchema = produtoObjectSchema;
export const produtoUpdateSchema = produtoObjectSchema.omit({ sku: true }).partial();

export type ProdutoInput = z.infer<typeof produtoInputSchema>;
export type ProdutoUpdate = z.infer<typeof produtoUpdateSchema>;
