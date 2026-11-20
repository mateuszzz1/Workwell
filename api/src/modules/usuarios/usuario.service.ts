/**
 * Regras de usuário: consultar e editar o próprio perfil e concluir o onboarding.
 *
 * Observação de privacidade: não existe rota que liste usuários. Cada pessoa
 * só consegue ver e alterar o próprio cadastro.
 */
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import * as habitoService from "../habitos/habito.service.js";
import type { HabitoInput } from "../habitos/habito.schema.js";
import { HABITOS_SUGERIDOS, SETORES, type OnboardingInput, type PerfilInput } from "./usuario.schema.js";

/** Campos do usuário que podem ser devolvidos ao frontend (nunca o hash da senha). */
export const camposPublicos = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  cargo: true,
  setor: true,
  areaResponsavel: true,
  pontosTotal: true,
  onboardingConcluido: true,
  prefNotificacao: true,
  empresa: { select: { id: true, nome: true } },
} as const;

type HabitoSugerido = (typeof HABITOS_SUGERIDOS)[number];

/** Configuração inicial de cada hábito sugerido no onboarding. */
const CONFIGURACAO_SUGERIDA: Record<HabitoSugerido, { nome: string; meta: number; unidade: HabitoInput["unidade"] }> = {
  water: { nome: "Beber água", meta: 8, unidade: "copos" },
  coffee: { nome: "Pausas no expediente", meta: 3, unidade: "pausas" },
  exercise: { nome: "Atividade física", meta: 30, unidade: "min" },
  sleep: { nome: "Registrar o sono", meta: 1, unidade: "registro" },
  meditation: { nome: "Respiração consciente", meta: 5, unidade: "min" },
};

export async function buscarPerfil(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: camposPublicos });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);
  return usuario;
}

/** UC01 - Atualiza os dados de perfil do próprio usuário. */
export async function atualizarPerfil(usuarioId: number, dados: PerfilInput) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { nome: dados.nome, cargo: dados.cargo, setor: dados.setor, prefNotificacao: dados.prefNotificacao },
    select: camposPublicos,
  });
}

/**
 * UC03 - Conclui o onboarding: salva o perfil, cria os hábitos escolhidos
 * e marca `onboardingConcluido`, liberando check-ins, hábitos e desafios.
 */
export async function concluirOnboarding(usuarioId: number, dados: OnboardingInput) {
  const usuario = await buscarPerfil(usuarioId);
  if (usuario.onboardingConcluido) {
    throw new AppError("O onboarding já foi concluído.", 409);
  }

  await atualizarPerfil(usuarioId, dados);

  for (const icone of dados.habitosIniciais) {
    await habitoService.criar(usuarioId, {
      ...CONFIGURACAO_SUGERIDA[icone],
      icone,
      frequencia: "DIARIA",
      diasSemana: [],
      quantidadeSemanal: null,
      permitirPausa: true,
      lembretesAtivos: false,
      horarios: [],
    });
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { onboardingConcluido: true },
    select: camposPublicos,
  });
}

/** Opções exibidas na tela de onboarding (a API é a fonte única dessas listas). */
export function opcoesOnboarding() {
  return {
    setores: SETORES,
    habitosSugeridos: HABITOS_SUGERIDOS.map((icone) => ({ icone, ...CONFIGURACAO_SUGERIDA[icone] })),
  };
}
