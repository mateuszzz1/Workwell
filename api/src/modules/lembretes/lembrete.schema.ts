/**
 * Validações dos lembretes de pausa, descanso e check-in (UC09).
 * (Os lembretes de cada hábito são configurados no próprio hábito.)
 */
import { z } from "zod";

/** Tipos que o colaborador configura aqui. "META" é exclusivo dos hábitos. */
export const TIPOS_LEMBRETE = ["PAUSA", "DESCANSO", "CHECKIN"] as const;

/** Opções do botão "adiar". */
export const MINUTOS_ADIAR = [5, 10, 15, 30] as const;

export const lembreteSchema = z
  .object({
    tipo: z.enum(TIPOS_LEMBRETE, "Escolha um tipo de lembrete."),
    horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use um horário válido (HH:mm)."),
    // Dias da semana (0 = domingo). Lista vazia = todos os dias.
    diasSemana: z.array(z.number().int().min(0).max(6)).max(7),
    ativo: z.boolean(),
  })
  .strict()
  .refine((dados) => new Set(dados.diasSemana).size === dados.diasSemana.length, {
    path: ["diasSemana"],
    message: "Os dias não podem se repetir.",
  });

export const adiarSchema = z.object({
  minutos: z.union(MINUTOS_ADIAR.map((m) => z.literal(m)), "Escolha 5, 10, 15 ou 30 minutos."),
});

export type LembreteInput = z.infer<typeof lembreteSchema>;
