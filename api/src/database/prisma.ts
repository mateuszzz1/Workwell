/**
 * Conexão com o PostgreSQL.
 *
 * Criamos UM cliente Prisma para toda a aplicação; os services importam
 * esta mesma instância. O adaptador `PrismaPg` usa o driver oficial `pg`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

/** Tipo do "cliente de transação": usado por funções que rodam dentro de `prisma.$transaction`. */
export type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
