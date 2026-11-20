/**
 * Tipos dos dados que a API devolve (exceto hábitos, em types/habitos.ts).
 * Devem espelhar as respostas dos services da API.
 */

export type PerfilUsuario = "COLABORADOR" | "GESTOR_RH";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  cargo: string | null;
  setor: string | null;
  areaResponsavel: string | null;
  pontosTotal: number;
  onboardingConcluido: boolean;
  prefNotificacao: boolean;
  empresa: { id: number; nome: string };
};

/** Resposta de login e cadastro. */
export type Sessao = { token: string; usuario: Usuario };

export type OpcoesOnboarding = {
  setores: string[];
  habitosSugeridos: Array<{ icone: string; nome: string; meta: number; unidade: string }>;
};

// --- Check-in -------------------------------------------------------------

export type Checkin = {
  id: number;
  data: string;
  humor: number;
  energia: number;
  sono: number | null;
  estresse: number | null;
  observacao: string | null;
};

export type ResumoColaborador = {
  hoje: string;
  /** Tamanho do período do resumo: 7 (semana) ou 30 (mês). */
  dias: number;
  checkinHoje: Checkin | null;
  historico: Checkin[];
  sequencia: number;
  medias: { humor: number | null; energia: number | null; sono: number | null; estresse: number | null };
};

export type RespostaCheckin = {
  mensagem: string;
  criado: boolean;
  pontosGanhos: number;
  medalhasNovas: string[];
};

// --- Lembretes (UC09) -----------------------------------------------------

export type TipoLembrete = "PAUSA" | "DESCANSO" | "CHECKIN";

export type Lembrete = {
  id: number;
  tipo: TipoLembrete;
  horario: string;
  diasSemana: number[];
  ativo: boolean;
  adiadoAte: string | null;
};

export type NovoLembrete = Omit<Lembrete, "id" | "adiadoAte">;

/** Lembrete que deve aparecer agora, com o texto do aviso. */
export type LembretePendente = Lembrete & { mensagem: string };

// --- Gamificação ----------------------------------------------------------

export type Medalha = {
  id: number;
  nome: string;
  descricao: string | null;
  criterio: string;
  conquistada: boolean;
  dataConquista: string | null;
};

export type ResumoGamificacao = { pontos: number; medalhas: Medalha[] };

// --- Desafios -------------------------------------------------------------

export type Desafio = {
  id: number;
  titulo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string;
  metaRegistros: number;
  pontosRecompensa: number;
  status: "ATIVO" | "ENCERRADO";
  aberto: boolean;
  participantes: number;
};

/** Visão do colaborador: inclui a própria participação. */
export type DesafioColaborador = Desafio & {
  participacao: { progresso: number; concluido: boolean; registradoHoje: boolean } | null;
};

/** Visão do RH: só contagens agregadas. */
export type DesafioRh = Desafio & { concluidos: number };

export type NovoDesafio = {
  titulo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string;
  metaRegistros: number;
  pontosRecompensa: number;
};

export type RespostaProgressoDesafio = {
  progresso: number;
  concluido: boolean;
  pontosGanhos: number;
  medalhasNovas: string[];
  mensagem: string;
};

// --- Painel do RH ---------------------------------------------------------

export type FiltrosDashboard = { inicio?: string; fim?: string; setor?: string };

export type DashboardRh = {
  empresa: { id: number; nome: string };
  periodo: { inicio: string; fim: string; dias: number };
  filtros: { setor: string | null };
  setoresDisponiveis: string[];
  privacidade: { dadosDisponiveis: boolean; limiarMinimo: number; mensagem: string };
  indicadores?: {
    colaboradores: number;
    participantes: number;
    taxaEngajamento: number;
    humorMedio: number | null;
    energiaMedia: number | null;
    sonoMedio: number | null;
    estresseMedio: number | null;
  };
  desafios?: { ativos: number; participantes: number; taxaAdesao: number; conclusoes: number };
  tendencia?: Array<{ data: string; participantes: number; humor: number | null; energia: number | null }>;
};
