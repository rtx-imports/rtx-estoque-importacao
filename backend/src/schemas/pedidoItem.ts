import { z } from "zod";

const pedidoItemObjectSchema = z.object({
  item_code: z.string().min(1).optional(),
  sku_interno: z.string().min(1).optional(),
  descricao: z.string().min(1),
  quantidade: z.number().positive(),
  unidade: z.string().min(1),
  preco_unitario: z.number().nonnegative(),
  atributos_extra: z.record(z.string(), z.unknown()).default({}),
});

export const pedidoItemInputSchema = pedidoItemObjectSchema;
export const pedidoItemUpdateSchema = pedidoItemObjectSchema.partial();

export type PedidoItemInput = z.infer<typeof pedidoItemInputSchema>;
export type PedidoItemUpdate = z.infer<typeof pedidoItemUpdateSchema>;
