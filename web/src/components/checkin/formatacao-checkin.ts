/**
 * Funções de exibição usadas pelos componentes de check-in.
 */

/** "2026-11-20..." -> "sex, 20/11" */
export function nomeDoDia(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })
    .format(new Date(data.length === 10 ? `${data}T12:00:00.000Z` : data))
    .replace(".", "");
}

/** Nota ou travessão quando o campo opcional ficou em branco. */
export const nota = (valor: number | null) => (valor === null ? "—" : String(valor));
