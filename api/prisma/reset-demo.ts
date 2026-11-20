/**
 * Restaura o estado da demonstração (rode antes de gravar o vídeo):
 * - Ana volta a estar com o check-in de hoje pendente, 60 pontos e sem medalhas;
 * - Ana sai dos desafios;
 * - contas criadas pelos testes automatizados (e-mail @teste.local) são removidas.
 *
 * Tudo dentro de uma transação: ou restaura tudo, ou nada.
 */
import { prisma } from "../src/database/prisma.js";
import { dataLocal } from "../src/utils/data.js";

async function main() {
  const ana = await prisma.usuario.findUnique({ where: { email: "user@ifsp.com" }, select: { id: true } });
  if (!ana) throw new Error("Usuária de demonstração não encontrada. Execute o seed.");

  await prisma.$transaction([
    prisma.checkin.deleteMany({ where: { usuarioId: ana.id, data: dataLocal() } }),
    prisma.conquistaMedalha.deleteMany({ where: { usuarioId: ana.id } }),
    prisma.participacaoDesafio.deleteMany({ where: { usuarioId: ana.id } }),
    prisma.usuario.update({ where: { id: ana.id }, data: { pontosTotal: 60 } }),
    prisma.usuario.deleteMany({ where: { email: { endsWith: "@teste.local" } } }),
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
