/**
 * Validação do check-in diário (UC04).
 *
 * Não existe campo `usuarioId`: o dono do check-in é sempre o usuário do token.
 */
import { z } from "zod";

/** Notas de 1 a 5. */
const escala = z.coerce.number().int().min(1).max(5);

export const salvarCheckinSchema = z.object({
  humor: escala,
  energia: escala,
  sono: escala.nullable().optional(),
  estresse: escala.nullable().optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
});

/** Período do resumo de progresso (UC07): semana (7) ou mês (30). */
export const consultaResumoSchema = z.object({
  dias: z.enum(["7", "30"]).default("7").transform(Number),
});

export type SalvarCheckinInput = z.infer<typeof salvarCheckinSchema>;
