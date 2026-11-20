/**
 * Pequenas funções de cálculo reaproveitadas pelos módulos.
 */

/** Média com uma casa decimal. Devolve `null` quando não há valores. */
export function media(valores: number[]) {
  if (valores.length === 0) return null;
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  return Number((total / valores.length).toFixed(1));
}

/** Remove os `null` de uma lista (ex.: campos opcionais do check-in). */
export function semNulos(valores: Array<number | null>) {
  return valores.filter((valor): valor is number => valor !== null);
}
