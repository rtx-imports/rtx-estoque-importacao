import { z } from "zod";

export const checklistItemInputSchema = z.object({
  descricao: z.string().min(1),
  grupo: z.string().min(1).nullable().optional(),
  ordem: z.number().int().default(0),
});

export const checklistItemUpdateSchema = z.object({
  descricao: z.string().min(1).optional(),
  grupo: z.string().min(1).nullable().optional(),
  concluido: z.boolean().optional(),
  ordem: z.number().int().optional(),
});

export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>;
export type ChecklistItemUpdate = z.infer<typeof checklistItemUpdateSchema>;
