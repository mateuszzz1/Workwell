/**
 * Painel de bem-estar organizacional (UC11).
 *
 * Devolve SOMENTE números agregados (médias, contagens, taxas) da empresa do
 * gestor. Nenhum nome, id ou check-in individual sai daqui. Se o grupo
 * filtrado tiver menos de LIMIAR_MINIMO pessoas, os números não são exibidos.
 */
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import type { UsuarioLogado } from "../../middlewares/autenticacao.js";
import { adicionarDias, chaveData, dataDeTexto, dataLocal, diasNoIntervalo } from "../../utils/data.js";
import { media, semNulos } from "../../utils/estatistica.js";
import { grupoPodeSerExibido, LIMIAR_MINIMO, MAXIMO_DIAS_PERIODO, setoresExibiveis, taxaEngajamento } from "./dashboard.regras.js";
import type { FiltrosDashboard } from "./dashboard.schema.js";

export async function obterResumo(gestor: UsuarioLogado, filtros: FiltrosDashboard) {
  // 1) Período: padrão = últimos 7 dias.
  const hoje = dataLocal();
  const fim = filtros.fim ? dataDeTexto(filtros.fim) : hoje;
  const inicio = filtros.inicio ? dataDeTexto(filtros.inicio) : adicionarDias(fim, -6);
  const dias = diasNoIntervalo(inicio, fim);
  if (dias > MAXIMO_DIAS_PERIODO) {
    throw new AppError(`Escolha um período de até ${MAXIMO_DIAS_PERIODO} dias.`);
  }

  // 2) Quem forma o grupo: colaboradores ativos da empresa que já concluíram o
  //    onboarding (só eles podem fazer check-in), filtrados por setor se pedido.
  const grupo = {
    empresaId: gestor.empresaId,
    perfil: "COLABORADOR" as const,
    ativo: true,
    onboardingConcluido: true,
    ...(filtros.setor ? { setor: filtros.setor } : {}),
  };

  const [empresa, colaboradores, porSetor] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: gestor.empresaId }, select: { id: true, nome: true } }),
    prisma.usuario.count({ where: grupo }),
    prisma.usuario.groupBy({
      by: ["setor"],
      where: { empresaId: gestor.empresaId, perfil: "COLABORADOR", ativo: true, onboardingConcluido: true },
      _count: { _all: true },
    }),
  ]);

  const base = {
    empresa,
    periodo: { inicio: chaveData(inicio), fim: chaveData(fim), dias },
    filtros: { setor: filtros.setor ?? null },
    setoresDisponiveis: setoresExibiveis(porSetor.map((item) => ({ setor: item.setor, quantidade: item._count._all }))),
  };

  // 3) Regra de privacidade: grupo pequeno -> sem números.
  if (!grupoPodeSerExibido(colaboradores)) {
    return {
      ...base,
      privacidade: {
        dadosDisponiveis: false,
        limiarMinimo: LIMIAR_MINIMO,
        mensagem: `São necessários ao menos ${LIMIAR_MINIMO} colaboradores no recorte para exibir dados agregados.`,
      },
    };
  }

  // 4) Check-ins do grupo no período (só os campos numéricos necessários).
  const checkins = await prisma.checkin.findMany({
    where: { data: { gte: inicio, lte: fim }, usuario: grupo },
    select: { data: true, usuarioId: true, humor: true, energia: true, sono: true, estresse: true },
  });

  const participantes = new Set(checkins.map((checkin) => checkin.usuarioId)).size;

  // 5) Adesão a desafios: desafios ativos no período e quantas pessoas do grupo participam.
  //    Só contagens; nenhum nome sai daqui.
  const desafiosNoPeriodo = { empresaId: gestor.empresaId, status: "ATIVO" as const, dataInicio: { lte: fim }, dataFim: { gte: inicio } };
  const [desafiosAtivos, participacoes] = await Promise.all([
    prisma.desafio.count({ where: desafiosNoPeriodo }),
    prisma.participacaoDesafio.findMany({
      where: { desafio: desafiosNoPeriodo, usuario: grupo },
      select: { usuarioId: true, concluido: true },
    }),
  ]);
  const participantesDesafios = new Set(participacoes.map((participacao) => participacao.usuarioId)).size;

  // 6) Tendência dia a dia (médias do dia, sem identificar ninguém).
  const tendencia = Array.from({ length: dias }, (_, indice) => {
    const dia = chaveData(adicionarDias(inicio, indice));
    const doDia = checkins.filter((checkin) => chaveData(checkin.data) === dia);
    return {
      data: dia,
      participantes: doDia.length,
      humor: media(doDia.map((checkin) => checkin.humor)),
      energia: media(doDia.map((checkin) => checkin.energia)),
    };
  });

  return {
    ...base,
    privacidade: {
      dadosDisponiveis: true,
      limiarMinimo: LIMIAR_MINIMO,
      mensagem: "Indicadores agregados e anônimos; nenhum registro individual é retornado.",
    },
    indicadores: {
      colaboradores,
      participantes,
      taxaEngajamento: taxaEngajamento(checkins.length, colaboradores, dias),
      humorMedio: media(checkins.map((checkin) => checkin.humor)),
      energiaMedia: media(checkins.map((checkin) => checkin.energia)),
      sonoMedio: media(semNulos(checkins.map((checkin) => checkin.sono))),
      estresseMedio: media(semNulos(checkins.map((checkin) => checkin.estresse))),
    },
    desafios: {
      ativos: desafiosAtivos,
      participantes: participantesDesafios,
      taxaAdesao: colaboradores ? Number(((participantesDesafios / colaboradores) * 100).toFixed(1)) : 0,
      conclusoes: participacoes.filter((participacao) => participacao.concluido).length,
    },
    tendencia,
  };
}
