import { z } from "zod";

const escala = z.coerce.number().int().min(1).max(5);

export const salvarCheckinSchema = z.object({
  usuarioId: z.coerce.number().int().positive(),
  humor: escala,
  energia: escala,
  sono: escala.optional().nullable(),
  estresse: escala.optional().nullable(),
  observacao: z.string().trim().max(500).optional().nullable(),
});

export const usuarioIdParamsSchema = z.object({
  usuarioId: z.coerce.number().int().positive(),
});

export type SalvarCheckinInput = z.infer<typeof salvarCheckinSchema>;
