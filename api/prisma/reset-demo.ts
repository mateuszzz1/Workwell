import { prisma } from "../src/database/prisma.js";
import { dataLocal } from "../src/utils/data.js";

async function main() {
  const ana = await prisma.usuario.findUnique({
    where: { email: "ana.souza@workwell.local" },
    select: { id: true },
  });

  if (!ana) {
    throw new Error("Usuária de demonstração não encontrada. Execute o seed.");
  }

  const medalha = await prisma.medalha.findUnique({
    where: { nome: "Primeiro passo" },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.checkin.deleteMany({
      where: { usuarioId: ana.id, data: dataLocal() },
    }),
    prisma.usuario.update({
      where: { id: ana.id },
      data: { pontosTotal: 60 },
    }),
    prisma.conquistaMedalha.deleteMany({
      where: {
        usuarioId: ana.id,
        ...(medalha ? { medalhaId: medalha.id } : {}),
      },
    }),
  ]);

  console.log("Demonstração restaurada: Ana está com o check-in de hoje pendente.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
