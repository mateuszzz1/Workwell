/**
 * Chamadas da API de hábitos e utilitários de data usados pelas telas de hábitos.
 */
import { api } from "./api";
import { carregarHabitos } from "./habitos-legado";
import type { ConfiguracaoHabito, DetalheHabito, PaginaHabitos, RegistroHabitoInput } from "../types/habitos";

const inicializacoes = new Map<number, Promise<void>>();

/** Chama uma rota de hábitos. O token de login é enviado automaticamente por api(). */
function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  return api<T>(`/habitos${caminho}`, opcoes);
}

/**
 * Versões antigas guardavam os hábitos só no navegador (localStorage).
 * Na primeira abertura, enviamos esses dados ao banco uma única vez.
 */
async function importarCache(usuarioId: number) {
  const marcador = `workwell-habitos-migrados-v1-${usuarioId}`;
  let existe: boolean;
  try {
    existe = !localStorage.getItem(marcador) && !!localStorage.getItem(`workwell-habitos-v1-${usuarioId}`);
  } catch {
    return;
  }
  if (!existe) return;
  const { registros } = carregarHabitos(usuarioId, dataSaoPaulo(), false);
  const validos = registros.filter((registro) => registro.data <= dataSaoPaulo());
  for (let indice = 0; indice < validos.length; indice += 10)
    await requisicao("/importacao", {
      method: "POST",
      body: JSON.stringify({ registros: validos.slice(indice, indice + 10) })
    });
  try {
    localStorage.setItem(marcador, "1");
  } catch {
    /* A importação é idempotente, mesmo sem marcador local. */
  }
}

/** Executa a importação do cache antigo uma única vez por usuário. */
export async function iniciarHabitos(usuarioId: number) {
  if (!inicializacoes.has(usuarioId))
    inicializacoes.set(
      usuarioId,
      importarCache(usuarioId).catch((erro) => {
        inicializacoes.delete(usuarioId);
        throw erro;
      })
    );
  await inicializacoes.get(usuarioId);
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
