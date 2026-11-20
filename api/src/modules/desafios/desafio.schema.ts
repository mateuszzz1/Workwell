/**
 * Validação da criação de desafios (UC14).
 */
import { z } from "zod";
import { dataSchema } from "../../utils/validacao.js";

export const criarDesafioSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe um título.").max(80),
    descricao: z.string().trim().max(300).nullable().optional(),
    dataInicio: dataSchema,
    dataFim: dataSchema,
    metaRegistros: z.number().int().min(1, "A meta deve ser de ao menos 1 dia.").max(60),
    pontosRecompensa: z.number().int().min(0).max(500),
  })
  .refine((dados) => dados.dataFim >= dados.dataInicio, {
    path: ["dataFim"],
    message: "A data final deve ser igual ou posterior à inicial.",
  });

export type CriarDesafioInput = z.infer<typeof criarDesafioSchema>;
