/**
 * Configuração da API.
 *
 * Lê as variáveis do arquivo `.env` e valida com Zod ANTES de a API subir.
 * Se algo estiver errado (ex.: porta inválida), a API para logo no início,
 * em vez de falhar de forma confusa no meio de uma requisição.
 */
import "dotenv/config";
import { z } from "zod";

// Segredo usado só em desenvolvimento, para quem ainda não configurou o .env.
const SEGREDO_DESENVOLVIMENTO = "workwell-segredo-apenas-para-desenvolvimento-local";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    CORS_ORIGIN: z.url().default("http://localhost:5173"),
    // Chave secreta que assina os tokens de login (veja utils/token.ts).
    TOKEN_SECRET: z.string().min(32, "TOKEN_SECRET precisa ter ao menos 32 caracteres.").default(SEGREDO_DESENVOLVIMENTO),
    // Por quantas horas um login continua válido.
    TOKEN_HORAS: z.coerce.number().int().min(1).max(168).default(8),
  })
  // Em produção é proibido usar o segredo padrão: qualquer um poderia forjar tokens.
  .refine((env) => env.NODE_ENV !== "production" || env.TOKEN_SECRET !== SEGREDO_DESENVOLVIMENTO, {
    path: ["TOKEN_SECRET"],
    message: "Defina um TOKEN_SECRET próprio em produção.",
  });

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error("Variáveis de ambiente inválidas:", z.flattenError(resultado.error).fieldErrors);
  throw new Error("Não foi possível carregar a configuração da API.");
}

/** Configuração já validada e com os tipos corretos. */
export const env = resultado.data;
