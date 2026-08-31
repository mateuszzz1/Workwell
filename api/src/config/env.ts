import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  CORS_ORIGIN: z.url().default("http://localhost:5173"),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error(
    "Variáveis de ambiente inválidas:",
    resultado.error.flatten().fieldErrors,
  );
  throw new Error("Não foi possível carregar a configuração da API.");
}

export const env = resultado.data;
