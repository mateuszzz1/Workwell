/**
 * Funções que chamam cada rota da API, agrupadas por assunto.
 * As telas usam estas funções em vez de montar URLs manualmente.
 * (As rotas de hábitos ficam em habitos-api.ts.)
 */
import type {
  DashboardRh,
  DesafioColaborador,
  Lembrete,
  LembretePendente,
  NovoLembrete,
  DesafioRh,
  FiltrosDashboard,
  NovoDesafio,
  OpcoesOnboarding,
  RespostaCheckin,
  RespostaProgressoDesafio,
  ResumoColaborador,
  ResumoGamificacao,
  Sessao,
  Usuario,
} from "../types";
import { api, enviar } from "./api";

// --- Autenticação (UC01/UC02) ----------------------------------------------
export const entrar = (email: string, senha: string) => enviar<Sessao>("/auth/login", "POST", { email, senha });
export const cadastrar = (nome: string, email: string, senha: string) =>
  enviar<Sessao>("/auth/cadastro", "POST", { nome, email, senha });

// --- Perfil e onboarding (UC01/UC03) ---------------------------------------
export type DadosPerfil = { nome: string; cargo: string | null; setor: string; prefNotificacao: boolean };

export const buscarPerfil = () => api<Usuario>("/usuarios/me");
export const atualizarPerfil = (dados: DadosPerfil) => enviar<Usuario>("/usuarios/me", "PUT", dados);
export const buscarOpcoesOnboarding = () => api<OpcoesOnboarding>("/usuarios/onboarding/opcoes");
export const concluirOnboarding = (dados: DadosPerfil & { habitosIniciais: string[] }) =>
  enviar<Usuario>("/usuarios/me/onboarding", "POST", dados);

// --- Check-in (UC04/UC07) ---------------------------------------------------
/** Sono e estresse podem ficar em branco (null). */
export type DadosCheckin = { humor: number; energia: number; sono: number | null; estresse: number | null; observacao: string };

export const buscarResumoCheckin = (dias: 7 | 30 = 7) => api<ResumoColaborador>(`/checkins/resumo?dias=${dias}`);
export const salvarCheckin = (dados: DadosCheckin) => enviar<RespostaCheckin>("/checkins", "POST", dados);

// --- Lembretes de pausa, descanso e check-in (UC09) -------------------------
export const listarLembretes = () => api<Lembrete[]>("/lembretes");
export const buscarLembretesPendentes = () => api<LembretePendente[]>("/lembretes/pendentes");
export const criarLembrete = (dados: NovoLembrete) => enviar<Lembrete>("/lembretes", "POST", dados);
export const editarLembrete = (id: number, dados: NovoLembrete) => enviar<Lembrete>(`/lembretes/${id}`, "PUT", dados);
export const excluirLembrete = (id: number) => api<{ mensagem: string }>(`/lembretes/${id}`, { method: "DELETE" });
export const adiarLembrete = (id: number, minutos: number) =>
  enviar<{ mensagem: string }>(`/lembretes/${id}/adiar`, "POST", { minutos });
export const dispensarLembrete = (id: number) => enviar<{ mensagem: string }>(`/lembretes/${id}/dispensar`, "POST");

// --- Gamificação (UC10) -----------------------------------------------------
export const buscarGamificacao = () => api<ResumoGamificacao>("/gamificacao/me");

// --- Desafios (UC08/UC14) ---------------------------------------------------
export const listarDesafiosColaborador = () => api<DesafioColaborador[]>("/desafios");
export const listarDesafiosRh = () => api<DesafioRh[]>("/desafios");
export const criarDesafio = (dados: NovoDesafio) => enviar<DesafioRh>("/desafios", "POST", dados);
export const encerrarDesafio = (id: number) => enviar<DesafioRh>(`/desafios/${id}/encerrar`, "PATCH");
export const participarDesafio = (id: number) => enviar<{ mensagem: string }>(`/desafios/${id}/participar`, "POST");
export const registrarProgressoDesafio = (id: number) =>
  enviar<RespostaProgressoDesafio>(`/desafios/${id}/progresso`, "POST");

// --- Painel do RH (UC11) ----------------------------------------------------
export function buscarDashboard(filtros: FiltrosDashboard) {
  // Monta a query string só com os filtros preenchidos.
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) if (valor) parametros.set(chave, valor);
  const query = parametros.toString();
  return api<DashboardRh>(`/dashboard${query ? `?${query}` : ""}`);
}
