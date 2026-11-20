/**
 * Funções de formatação de texto para exibição.
 */

/** "2026-11-20" -> "20/11" */
export function diaMes(data: string) {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** Período de um desafio: "18/11 a 02/12". */
export function formatarPeriodo(inicio: string, fim: string) {
  return `${diaMes(inicio)} a ${diaMes(fim)}`;
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo, somando `dias` (pode ser negativo). */
export function dataHoje(dias = 0) {
  const data = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}
