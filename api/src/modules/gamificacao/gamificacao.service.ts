/**
 * Serviço de gamificação: soma pontos e concede medalhas.
 *
 * As funções `adicionarPontos` e `concederMedalha` recebem a transação (`tx`)
 * de quem as chama. Assim, se o check-in falhar, os pontos também não são
 * gravados: ou tudo acontece, ou nada acontece.
 */
import { prisma, type Transacao } from "../../database/prisma.js";
import { MEDALHAS } from "./gamificacao.regras.js";

type ChaveMedalha = keyof typeof MEDALHAS;

/** Soma (ou subtrai, se negativo) pontos ao total do usuário. */
export async function adicionarPontos(tx: Transacao, usuarioId: number, pontos: number) {
  if (pontos === 0) return;
  await tx.usuario.update({
    where: { id: usuarioId },
    data: { pontosTotal: { increment: pontos } },
  });
}

/**
 * Concede uma medalha, se o usuário ainda não a tiver.
 * Devolve `true` quando a medalha é nova (para avisar o usuário na tela).
 */
export async function concederMedalha(tx: Transacao, usuarioId: number, chave: ChaveMedalha) {
  const dados = MEDALHAS[chave];

  // Cria a medalha no catálogo caso o seed ainda não tenha criado.
  const medalha = await tx.medalha.upsert({
    where: { nome: dados.nome },
    update: {},
    create: dados,
  });

  const jaTem = await tx.conquistaMedalha.findUnique({
    where: { usuarioId_medalhaId: { usuarioId, medalhaId: medalha.id } },
  });
  if (jaTem) return false;

  await tx.conquistaMedalha.create({ data: { usuarioId, medalhaId: medalha.id } });
  return true;
}

/** Pontos do usuário e todas as medalhas, indicando quais ele já conquistou. */
export async function obterResumo(usuarioId: number) {
  const [usuario, medalhas] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { pontosTotal: true } }),
    prisma.medalha.findMany({
      orderBy: { id: "asc" },
      include: { conquistas: { where: { usuarioId }, select: { dataConquista: true } } },
    }),
  ]);

  return {
    pontos: usuario.pontosTotal,
    medalhas: medalhas.map((medalha) => ({
      id: medalha.id,
      nome: medalha.nome,
      descricao: medalha.descricao,
      criterio: medalha.criterio,
      icone: medalha.icone,
      conquistada: medalha.conquistas.length > 0,
      dataConquista: medalha.conquistas[0]?.dataConquista ?? null,
    })),
  };
}
