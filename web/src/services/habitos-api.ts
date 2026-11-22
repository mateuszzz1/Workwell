/**
 * Chamadas da API de hábitos e utilitários de data usados pelas telas de hábitos.
 */
import { api } from "./api";
import type { ConfiguracaoHabito, DetalheHabito, PaginaHabitos, RegistroHabitoInput } from "../types/habitos";

/** Chama uma rota de hábitos. O token de login é enviado automaticamente por api(). */
function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  return api<T>(`/habitos${caminho}`, opcoes);
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo, igual à API. */
export function dataSaoPaulo(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(data);
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

/** Os 7 dias (domingo a sábado) da semana que contém a data. */
export function diasDaSemana(data: string) {
  const inicio = new Date(`${data}T12:00:00Z`);
  inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  return Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(inicio);
    dia.setUTCDate(dia.getUTCDate() + indice);
    return dia.toISOString().slice(0, 10);
  });
}

/** Formata uma data AAAA-MM-DD em português (ex.: "seg, 20/11"). */
export const formatarDia = (data: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
// --- Rotas da API de hábitos ---------------------------------------------------
export const listarHabitos = (data: string) => requisicao<PaginaHabitos>(`?data=${data}`);
export const detalharHabito = (id: number, data: string) =>
  requisicao<DetalheHabito>(`/${id}?data=${data}`);
export const salvarConfiguracaoHabito = (dados: ConfiguracaoHabito, id?: number) =>
  requisicao<DetalheHabito>(id ? `/${id}` : "", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(dados)
  });
export const registrarHabito = (id: number, dados: RegistroHabitoInput) =>
  requisicao<DetalheHabito>(`/${id}/registro`, {
    method: "PUT",
    body: JSON.stringify(dados)
  });
export const excluirHabito = (id: number) =>
  requisicao<{ mensagem: string }>(`/${id}`, { method: "DELETE" });
