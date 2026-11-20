/**
 * Datas sem horário.
 *
 * Check-ins, hábitos e desafios trabalham com "o dia" (ex.: 2026-11-20), não
 * com um instante. Para evitar erros de fuso, representamos cada dia como
 * meia-noite UTC daquele dia no calendário de São Paulo.
 */
const FUSO_HORARIO = "America/Sao_Paulo";

/** Dia atual (ou da data informada) no calendário de São Paulo. */
export function dataLocal(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return new Date(`${valor.year}-${valor.month}-${valor.day}T00:00:00.000Z`);
}

/** Converte "AAAA-MM-DD" para o formato de dia usado no sistema. */
export function dataDeTexto(texto: string) {
  return new Date(`${texto}T00:00:00.000Z`);
}

/** Soma (ou subtrai, se negativo) dias a uma data. */
export function adicionarDias(data: Date, quantidade: number) {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

/** Texto "AAAA-MM-DD" de uma data; útil para comparar dias. */
export function chaveData(data: Date) {
  return data.toISOString().slice(0, 10);
}

/** Quantidade de dias de `inicio` até `fim`, contando os dois. */
export function diasNoIntervalo(inicio: Date, fim: Date) {
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
}
