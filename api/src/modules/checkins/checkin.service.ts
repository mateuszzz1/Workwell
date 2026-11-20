/**
 * Check-in diário (UC04) e progresso pessoal (UC07).
 *
 * Regras:
 * - um check-in por dia por colaborador (garantido também no banco por @@unique);
 * - registrar de novo no mesmo dia EDITA o check-in, sem dar pontos outra vez;
 * - o primeiro check-in do dia vale pontos e pode conceder medalhas (UC10).
 */
import { prisma } from "../../database/prisma.js";
import { adicionarDias, dataLocal } from "../../utils/data.js";
import { media, semNulos } from "../../utils/estatistica.js";
import { DIAS_PARA_CONSISTENCIA, MEDALHAS, PONTOS } from "../gamificacao/gamificacao.regras.js";
import { adicionarPontos, concederMedalha } from "../gamificacao/gamificacao.service.js";
import { calcularSequencia } from "./checkin.regras.js";
import type { SalvarCheckinInput } from "./checkin.schema.js";

const camposCheckin = {
  id: true,
  data: true,
  humor: true,
  energia: true,
  sono: true,
  estresse: true,
  observacao: true,
} as const;

/**
 * Resumo do período (7 ou 30 dias): check-in de hoje, histórico, médias e sequência.
 * O histórico alimenta os gráficos semanal e mensal da página Progresso.
 */
export async function obterResumo(usuarioId: number, dias = 7) {
  const hoje = dataLocal();
  const inicio = adicionarDias(hoje, -(dias - 1));

  const historico = await prisma.checkin.findMany({
    where: { usuarioId, data: { gte: inicio, lte: hoje } },
    orderBy: { data: "asc" },
    select: camposCheckin,
  });

  // Para a sequência buscamos mais dias (até 60), não só a última semana.
  const datasRecentes = await prisma.checkin.findMany({
    where: { usuarioId, data: { gte: adicionarDias(hoje, -60) } },
    select: { data: true },
  });

  return {
    hoje: hoje.toISOString().slice(0, 10),
    dias,
    checkinHoje: historico.find((checkin) => checkin.data.getTime() === hoje.getTime()) ?? null,
    historico,
    sequencia: calcularSequencia(
      datasRecentes.map((registro) => registro.data),
      hoje,
    ),
    medias: {
      humor: media(historico.map((checkin) => checkin.humor)),
      energia: media(historico.map((checkin) => checkin.energia)),
      sono: media(semNulos(historico.map((checkin) => checkin.sono))),
      estresse: media(semNulos(historico.map((checkin) => checkin.estresse))),
    },
  };
}

/** Cria o check-in de hoje ou atualiza o já existente. */
export async function salvar(usuarioId: number, dados: SalvarCheckinInput) {
  const hoje = dataLocal();
  const valores = {
    humor: dados.humor,
    energia: dados.energia,
    sono: dados.sono ?? null,
    estresse: dados.estresse ?? null,
    observacao: dados.observacao || null,
  };

  // Tudo dentro de uma transação: check-in, pontos e medalhas são gravados juntos.
  return prisma.$transaction(async (tx) => {
    const existente = await tx.checkin.findUnique({
      where: { usuarioId_data: { usuarioId, data: hoje } },
      select: { id: true },
    });

    const checkin = await tx.checkin.upsert({
      where: { usuarioId_data: { usuarioId, data: hoje } },
      update: valores,
      create: { usuarioId, data: hoje, ...valores },
      select: camposCheckin,
    });

    if (existente) {
      return { checkin, criado: false, pontosGanhos: 0, medalhasNovas: [], mensagem: "Check-in de hoje atualizado." };
    }

    // Primeiro check-in do dia: pontos e medalhas.
    await adicionarPontos(tx, usuarioId, PONTOS.CHECKIN);
    const medalhasNovas: string[] = [];

    if (await concederMedalha(tx, usuarioId, "PRIMEIRO_PASSO")) {
      medalhasNovas.push(MEDALHAS.PRIMEIRO_PASSO.nome);
    }

    const datas = await tx.checkin.findMany({
      where: { usuarioId, data: { gte: adicionarDias(hoje, -DIAS_PARA_CONSISTENCIA) } },
      select: { data: true },
    });
    const sequencia = calcularSequencia(
      datas.map((registro) => registro.data),
      hoje,
    );
    if (sequencia >= DIAS_PARA_CONSISTENCIA && (await concederMedalha(tx, usuarioId, "CONSISTENCIA"))) {
      medalhasNovas.push(MEDALHAS.CONSISTENCIA.nome);
    }

    return {
      checkin,
      criado: true,
      pontosGanhos: PONTOS.CHECKIN,
      medalhasNovas,
      mensagem: `Check-in registrado. Você ganhou ${PONTOS.CHECKIN} pontos!`,
    };
  });
}
