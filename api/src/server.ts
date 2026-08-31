import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(`API em http://localhost:${env.PORT}/api`);
});

export async function encerrar() {
  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
  await prisma.$disconnect();
}

async function encerrarProcesso() {
  await encerrar();
  process.exit(0);
}

process.on("SIGINT", encerrarProcesso);
process.on("SIGTERM", encerrarProcesso);
