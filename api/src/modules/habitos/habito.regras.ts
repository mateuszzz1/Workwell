/**
 * Regras "puras" dos hábitos (UC05/UC06/UC07): só cálculos, sem banco.
 *
 * Vocabulário:
 * - meta: um hábito configurado pelo colaborador (ex.: "Beber 8 copos de água");
 * - registro: o progresso daquele hábito em um dia (ex.: 5 de 8 copos);
 * - agendado: o hábito deve aparecer naquele dia? (depende da frequência);
 * - pausado: o colaborador escolheu "pular" o dia sem quebrar a sequência.
 */
import { adicionarDias, chaveData } from "../../utils/data.js";

export type RegistroRegra = {
  data: Date;
  valor: number;
  pausado: boolean;
  concluido: boolean;
  metaAlvo: number | null;
  avaliacaoSono: number | null;
};

export type MetaRegra = {
  id: number;
  frequenciaAlvo: number;
  periodo: string;
  diasSemana: number[];
  quantidadeSemanal: number | null;
  dataInicio: Date;
  dataFim: Date | null;
  registros: RegistroRegra[];
};

/** Domingo da semana da data informada. */
export function inicioSemana(data: Date) {
  return adicionarDias(data, -data.getUTCDay());
}

/** Os `quantidade` dias que terminam na data informada (padrão: 7). */
export function diasDoPeriodo(data: Date, quantidade = 7) {
  return Array.from({ length: quantidade }, (_, indice) => adicionarDias(data, indice - quantidade + 1));
}

/** Registro da meta no dia, se houver. */
export function registroDoDia(meta: MetaRegra, dia: Date) {
  return meta.registros.find((registro) => chaveData(registro.data) === chaveData(dia));
}

/** O hábito deve aparecer neste dia? */
export function agendado(meta: MetaRegra, dia: Date) {
  // Fora do período de vigência do hábito.
  if (dia < meta.dataInicio || (meta.dataFim && dia > meta.dataFim)) return false;

  // Se já existe registro, o dia sempre aparece (para não "sumir" com o histórico).
  if (registroDoDia(meta, dia)) return true;

  // Frequência "dias específicos": só nos dias da semana escolhidos (0 = domingo).
  if (meta.diasSemana.length && !meta.diasSemana.includes(dia.getUTCDay())) return false;

  // Frequência "X vezes por semana": some quando a cota da semana já foi cumprida.
  if (meta.periodo === "SEMANAL" && meta.quantidadeSemanal) {
    const inicio = inicioSemana(dia);
    const feitosNaSemana = meta.registros.filter(
      (registro) => registro.data >= inicio && registro.data < dia && registro.concluido && !registro.pausado,
    ).length;
    if (feitosNaSemana >= meta.quantidadeSemanal) return false;
  }

  return true;
}

/** Situação do hábito em um dia: progresso, alvo e estado para a tela. */
export function situacao(meta: MetaRegra, dia: Date) {
  const registro = registroDoDia(meta, dia);
  // Usa o alvo da época do registro: mudar a meta hoje não altera o passado.
  const alvo = registro?.metaAlvo ?? meta.frequenciaAlvo;
  const valor = registro?.valor ?? 0;
  const pausado = registro?.pausado ?? false;

  let estado: "PAUSADO" | "CONCLUIDO" | "EM_ANDAMENTO" | "NAO_INICIADO" = "NAO_INICIADO";
  if (pausado) estado = "PAUSADO";
  else if (valor >= alvo) estado = "CONCLUIDO";
  else if (valor > 0) estado = "EM_ANDAMENTO";

  return {
    valor,
    meta: alvo,
    pausado,
    concluido: !pausado && valor >= alvo,
    estado,
    avaliacaoSono: registro?.avaliacaoSono ?? null,
  };
}

/** Quantos hábitos do dia foram feitos, de quantos (os pausados não contam). */
export function resumoDoDia(metas: MetaRegra[], dia: Date) {
  const doDia = metas.filter((meta) => agendado(meta, dia));
  const pausados = doDia.filter((meta) => situacao(meta, dia).pausado).length;
  const feitos = doDia.filter((meta) => situacao(meta, dia).concluido).length;
  return { data: chaveData(dia), feitos, total: doDia.length - pausados, pausados };
}

/** Resumo da semana: dia selecionado, sequência, % da semana, histórico e mensagem de incentivo. */
export function resumirPeriodo(metas: MetaRegra[], selecionada: Date, hoje: Date) {
  const referencia = selecionada > hoje ? hoje : selecionada;
  const dias = diasDoPeriodo(referencia);
  const historico = dias.map((dia) => resumoDoDia(metas, dia));
  const total = historico.reduce((soma, dia) => soma + dia.total, 0);
  const feitos = historico.reduce((soma, dia) => soma + dia.feitos, 0);

  // Sequência: dias seguidos (para trás) com ao menos um hábito concluído.
  // Dias sem hábitos programados não quebram a sequência; hoje ainda pode ser feito.
  let sequencia = 0;
  let encontrouRegistro = false;
  for (let indice = 0; indice < 365; indice++) {
    const resumo = resumoDoDia(metas, adicionarDias(referencia, -indice));
    if (!resumo.total) continue;
    if (!resumo.feitos) {
      if (indice === 0 && !encontrouRegistro) continue;
      break;
    }
    encontrouRegistro = true;
    sequencia++;
  }

  const registrados = metas
    .flatMap((meta) => meta.registros)
    .filter((registro) => registro.data >= dias[0]! && registro.data <= referencia && !registro.pausado).length;

  let insight = "Tudo bem diminuir o ritmo. Escolha uma pequena ação que faça sentido para hoje.";
  if (registrados < 3) insight = "Continue registrando seus hábitos para acompanhar seu ritmo ao longo do tempo.";
  else if (feitos > 0) insight = "Você tem reservado momentos para cuidar da sua rotina. Cada pequeno passo conta.";

  return {
    ...resumoDoDia(metas, selecionada),
    sequencia,
    semana: total ? Math.round((feitos / total) * 100) : 0,
    historico,
    insight,
  };
}
