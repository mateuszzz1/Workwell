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
  ativo: boolean;
  criadoEm: string;
  empresa: { id: number; nome: string };
};

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
  checkinHoje: Checkin | null;
  historico: Checkin[];
  sequencia: number;
  medias: {
    humor: number | null;
    energia: number | null;
    sono: number | null;
    estresse: number | null;
  };
};

export type DashboardRh = {
  gestor: { id: number; nome: string };
  empresa: { id: number; nome: string };
  privacidade: {
    dadosDisponiveis: boolean;
    limiarMinimo: number;
    mensagem: string;
  };
  periodo?: { inicio: string; fim: string; dias: number };
  indicadores?: {
    colaboradores: number;
    participantes: number;
    taxaEngajamento: number;
    humorMedio: number | null;
    energiaMedia: number | null;
    sonoMedio: number | null;
    estresseMedio: number | null;
  };
  tendencia?: Array<{
    data: string;
    participantes: number;
    humor: number | null;
    energia: number | null;
  }>;
};
