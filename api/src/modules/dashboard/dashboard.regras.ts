/**
 * Regras de privacidade e cálculo do painel do RH (UC11), sem banco.
 *
 * Regra principal: o RH só vê números de grupos com pelo menos
 * LIMIAR_MINIMO colaboradores. Num grupo de 2 pessoas, uma média
 * praticamente revela o check-in de cada uma; com 5 ou mais, não.
 * (Regra de engenharia adotada pelo grupo; validar com o professor.)
 */

export const LIMIAR_MINIMO = 5;

/** Período máximo que o filtro aceita, para manter a consulta leve. */
export const MAXIMO_DIAS_PERIODO = 90;

/** O grupo é grande o bastante para ser exibido sem risco de identificar alguém? */
export function grupoPodeSerExibido(quantidadeColaboradores: number) {
  return quantidadeColaboradores >= LIMIAR_MINIMO;
}

/**
 * Taxa de engajamento (%) = check-ins feitos / check-ins esperados.
 * Esperado = um check-in por colaborador por dia do período.
 */
export function taxaEngajamento(totalCheckins: number, colaboradores: number, dias: number) {
  const esperados = colaboradores * dias;
  if (esperados === 0) return 0;
  return Number(((totalCheckins / esperados) * 100).toFixed(1));
}

/** Só oferece no filtro os setores que têm gente suficiente para respeitar o limiar. */
export function setoresExibiveis(contagemPorSetor: Array<{ setor: string | null; quantidade: number }>) {
  return contagemPorSetor
    .filter((item): item is { setor: string; quantidade: number } => !!item.setor && grupoPodeSerExibido(item.quantidade))
    .map((item) => item.setor)
    .sort((a, b) => a.localeCompare(b));
}
