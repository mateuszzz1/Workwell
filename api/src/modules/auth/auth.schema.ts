/**
 * Validações de cadastro e login.
 */
import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));

/** UC01 - Criar conta. Sempre cria um COLABORADOR: ninguém se cadastra sozinho como RH. */
export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email,
  senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(72),
});

/** UC02 - Autenticar. */
export const loginSchema = z.object({
  email,
  senha: z.string().min(1, "Informe a senha.").max(72),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
