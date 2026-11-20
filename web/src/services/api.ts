/**
 * Cliente HTTP da aplicação: toda chamada à API passa por aqui.
 *
 * Responsabilidades:
 * - prefixar o caminho com /api (o Vite redireciona para a API, veja vite.config.ts);
 * - enviar o token de login no cabeçalho Authorization;
 * - transformar respostas de erro em `ApiRequestError` com a mensagem da API;
 * - avisar a aplicação quando a sessão expira (resposta 401), para voltar ao login.
 */

type DetalheErro = { campo: string; mensagem: string };
type CorpoErro = { erro?: string; detalhes?: DetalheErro[] };

/** Erro vindo da API, com o código HTTP e os campos inválidos (quando houver). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly detalhes: DetalheErro[];

  constructor(message: string, status: number, detalhes: DetalheErro[] = []) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}

// ---------------------------------------------------------------------------
// Token de login
// ---------------------------------------------------------------------------
// O token fica no localStorage para o login sobreviver a um F5.
// O acesso fica dentro de try/catch porque o navegador pode bloquear o
// armazenamento (ex.: janela anônima com restrições).

const CHAVE_TOKEN = "workwell-token";

function lerTokenSalvo() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

let token: string | null = lerTokenSalvo();
let aoExpirarSessao: () => void = () => {};

/** Guarda (ou apaga, com `null`) o token após login/logout. */
export function definirToken(novo: string | null) {
  token = novo;
  try {
    if (novo) localStorage.setItem(CHAVE_TOKEN, novo);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* sem armazenamento: o login vale só até recarregar a página */
  }
}

export function temToken() {
  return token !== null;
}

/** Registra o que fazer quando a API responder 401 (sessão expirada). */
export function quandoSessaoExpirar(callback: () => void) {
  aoExpirarSessao = callback;
}

// ---------------------------------------------------------------------------
// Requisição
// ---------------------------------------------------------------------------

/**
 * Faz uma requisição à API e devolve o JSON já tipado.
 * Exemplo: const perfil = await api<Usuario>("/usuarios/me");
 */
export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as CorpoErro;
    // 401 com token = sessão vencida. Sem token é só um login errado.
    if (resposta.status === 401 && token) {
      definirToken(null);
      aoExpirarSessao();
    }
    throw new ApiRequestError(corpo.erro ?? "Não foi possível concluir a operação.", resposta.status, corpo.detalhes);
  }

  return resposta.json() as Promise<T>;
}

/** Atalho para enviar um corpo JSON (POST/PUT/PATCH). */
export function enviar<T>(caminho: string, metodo: "POST" | "PUT" | "PATCH", corpo?: unknown) {
  return api<T>(caminho, { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}
