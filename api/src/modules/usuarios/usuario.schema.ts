import { z } from "zod";

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  empresaId: z.coerce.number().int().positive().optional(),
  perfil: z.enum(["COLABORADOR", "GESTOR_RH"]).default("COLABORADOR"),
});

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
