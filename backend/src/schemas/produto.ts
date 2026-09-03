import { z } from "zod";

const produtoObjectSchema = z.object({
  sku: z.string().min(1),
  descricao: z.string().default(""),
  unidades_por_caixa: z.number().positive().default(1),
  custo_unit_usd: z.number().nonnegative().default(0),
  ativo: z.boolean().default(true),
  // Se não vier, é calculado do SKU (ver classificarTipoPorSku, só cobre
  // rolinho/placa) — referencia tipos_produto.nome (cadastro dinâmico),
  // então também aceita qualquer tipo novo cadastrado ali (atribuição manual).
  tipo: z.string().min(1).nullable().optional(),
});

export const produtoInputSchema = produtoObjectSchema;
export const produtoUpdateSchema = produtoObjectSchema.omit({ sku: true }).partial();

export type ProdutoInput = z.infer<typeof produtoInputSchema>;
export type ProdutoUpdate = z.infer<typeof produtoUpdateSchema>;
