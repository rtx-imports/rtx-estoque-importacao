import { z } from "zod";

export const tipoProdutoInputSchema = z.object({
  nome: z.string().min(1),
});

export type TipoProdutoInput = z.infer<typeof tipoProdutoInputSchema>;
