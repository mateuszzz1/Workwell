/**
 * Filtros do painel do RH: período (início/fim) e setor. Todos opcionais.
 * Sem período, o painel mostra os últimos 7 dias.
 */
import { z } from "zod";
import { dataSchema } from "../../utils/validacao.js";

export const filtrosDashboardSchema = z
  .object({
    inicio: dataSchema.optional(),
    fim: dataSchema.optional(),
    setor: z.string().trim().min(1).max(60).optional(),
  })
  .refine((filtros) => !filtros.inicio || !filtros.fim || filtros.inicio <= filtros.fim, {
    path: ["fim"],
    message: "A data final deve ser igual ou posterior à inicial.",
  });

export type FiltrosDashboard = z.infer<typeof filtrosDashboardSchema>;
