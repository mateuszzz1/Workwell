/**
 * Lembretes de pausa, descanso e check-in (UC09).
 *
 * O colaborador cria lembretes com horário e dias da semana. A tela pergunta
 * periodicamente quais estão "pendentes" e mostra um aviso, que pode ser
 * dispensado ou adiado (Lembrete.adiar() do diagrama de classes).
 */
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import { dataLocal } from "../../utils/data.js";
import { deveAparecer, momentoAtual } from "./lembrete.regras.js";
import { TIPOS_LEMBRETE, type LembreteInput } from "./lembrete.schema.js";

const MAXIMO_LEMBRETES = 20;

/** Texto exibido no aviso de cada tipo. */
const MENSAGENS: Record<(typeof TIPOS_LEMBRETE)[number], string> = {
  PAUSA: "Hora de uma pausa: levante, alongue-se e respire fundo.",
  DESCANSO: "Hora de descansar: desacelere e cuide do seu sono.",
  CHECKIN: "Você ainda não fez o check-in de hoje. Leva só um minuto!",
};

/** Lembrete no formato da tela. */
function apresentar(lembrete: {
  id: number;
  tipo: string;
  horario: Date;
  diasSemana: number[];
  ativo: boolean;
  adiadoAte: Date | null;
}) {
  return {
    id: lembrete.id,
    tipo: lembrete.tipo as (typeof TIPOS_LEMBRETE)[number],
    horario: lembrete.horario.toISOString().slice(11, 16),
    diasSemana: lembrete.diasSemana,
    ativo: lembrete.ativo,
    adiadoAte: lembrete.adiadoAte,
  };
}

/** Busca um lembrete do próprio usuário (nunca de hábito) ou responde 404. */
async function buscar(usuarioId: number, id: number) {
  const lembrete = await prisma.lembrete.findFirst({
    where: { id, usuarioId, metaId: null, tipo: { in: [...TIPOS_LEMBRETE] } },
  });
  if (!lembrete) throw new AppError("Lembrete não encontrado.", 404);
  return lembrete;
}

/** Converte "HH:mm" no formato de hora do banco. */
const horaDoBanco = (horario: string) => new Date(`1970-01-01T${horario}:00Z`);

export async function listar(usuarioId: number) {
  const lembretes = await prisma.lembrete.findMany({
    where: { usuarioId, metaId: null, tipo: { in: [...TIPOS_LEMBRETE] } },
    orderBy: { horario: "asc" },
  });
  return lembretes.map(apresentar);
}

export async function criar(usuarioId: number, dados: LembreteInput) {
  const total = await prisma.lembrete.count({ where: { usuarioId, metaId: null } });
  if (total >= MAXIMO_LEMBRETES) throw new AppError(`Você pode ter até ${MAXIMO_LEMBRETES} lembretes.`);

  const lembrete = await prisma.lembrete.create({
    data: { usuarioId, tipo: dados.tipo, horario: horaDoBanco(dados.horario), diasSemana: dados.diasSemana, ativo: dados.ativo },
  });
  return apresentar(lembrete);
}

export async function editar(usuarioId: number, id: number, dados: LembreteInput) {
  await buscar(usuarioId, id);
  const lembrete = await prisma.lembrete.update({
    where: { id },
    data: {
      tipo: dados.tipo,
      horario: horaDoBanco(dados.horario),
      diasSemana: dados.diasSemana,
      ativo: dados.ativo,
      adiadoAte: null, // mudar a configuração cancela um adiamento pendente
    },
  });
  return apresentar(lembrete);
}

export async function excluir(usuarioId: number, id: number) {
  await buscar(usuarioId, id);
  await prisma.lembrete.delete({ where: { id } });
  return { mensagem: "Lembrete excluído." };
}

/** Adia o lembrete por alguns minutos. */
export async function adiar(usuarioId: number, id: number, minutos: number) {
  await buscar(usuarioId, id);
  const adiadoAte = new Date(Date.now() + minutos * 60_000);
  await prisma.lembrete.update({ where: { id }, data: { adiadoAte } });
  return { mensagem: `Tudo bem! Lembraremos de novo em ${minutos} minutos.`, adiadoAte };
}

/** Dispensa o aviso. Se estava adiado, o adiamento termina aqui. */
export async function dispensar(usuarioId: number, id: number) {
  await buscar(usuarioId, id);
  await prisma.lembrete.update({ where: { id }, data: { adiadoAte: null } });
  return { mensagem: "Lembrete dispensado." };
}

/**
 * Lembretes que devem aparecer agora.
 * - Respeita a preferência de notificações do perfil.
 * - O de check-in não aparece se o check-in de hoje já foi feito.
 */
export async function pendentes(usuarioId: number) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { prefNotificacao: true } });
  if (!usuario.prefNotificacao) return [];

  const momento = momentoAtual();
  const lembretes = (await listar(usuarioId)).filter((lembrete) => deveAparecer(lembrete, momento));
  if (lembretes.length === 0) return [];

  const fezCheckin = await prisma.checkin.findUnique({
    where: { usuarioId_data: { usuarioId, data: dataLocal() } },
    select: { id: true },
  });

  return lembretes
    .filter((lembrete) => !(lembrete.tipo === "CHECKIN" && fezCheckin))
    .map((lembrete) => ({ ...lembrete, mensagem: MENSAGENS[lembrete.tipo] }));
}
