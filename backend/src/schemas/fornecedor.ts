import { z } from "zod";

const fornecedorObjectSchema = z.object({
  nome: z.string().min(1),
  pais: z.string().min(1).optional(),
  contato_nome: z.string().min(1).optional(),
  contato_email: z.string().email().optional(),
  contato_telefone: z.string().min(1).optional(),
  contato_wechat: z.string().min(1).optional(),
  moeda_padrao: z.string().length(3).default("USD"),
  exige_pagamento_inicial: z.boolean().default(false),
  percentual_pagamento_inicial: z.number().min(0).max(100).nullable().optional(),
  layout_pedido: z.record(z.string(), z.unknown()).default({}),
});

export const fornecedorInputSchema = fornecedorObjectSchema.refine(
  (data) => !data.exige_pagamento_inicial || data.percentual_pagamento_inicial != null,
  {
    message: "percentual_pagamento_inicial é obrigatório quando exige_pagamento_inicial=true",
    path: ["percentual_pagamento_inicial"],
  },
);

export const fornecedorUpdateSchema = fornecedorObjectSchema.partial();

export type FornecedorInput = z.infer<typeof fornecedorInputSchema>;
export type FornecedorUpdate = z.infer<typeof fornecedorUpdateSchema>;
