/**
 * Ponto de entrada da API: abre a porta HTTP.
 *
 * Também trata o encerramento (Ctrl+C ou parada do servidor): fecha as
 * conexões abertas e desconecta do banco antes de sair.
 */
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(`API em http://localhost:${env.PORT}/api`);
});

async function encerrar() {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
