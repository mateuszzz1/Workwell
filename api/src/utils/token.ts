/**
 * Token de sessão (login).
 *
 * Depois do login, a API entrega um token ao navegador. Em toda requisição o
 * navegador o devolve no cabeçalho `Authorization: Bearer <token>`.
 *
 * O token tem duas partes separadas por ponto:
 *   <dados em base64>.<assinatura>
 *
 * - dados: id do usuário, perfil e data de expiração (não são secretos);
 * - assinatura: HMAC-SHA256 dos dados com o TOKEN_SECRET.
 *
 * Só quem conhece o segredo (a API) consegue gerar uma assinatura válida.
 * Se alguém alterar os dados (ex.: trocar o perfil para RH), a assinatura
 * deixa de bater e o token é recusado. É a mesma ideia de um JWT, só que
 * escrita em poucas linhas para ficar fácil de explicar.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import type { PerfilUsuario } from "../generated/prisma/enums.js";

export type DadosToken = {
  usuarioId: number;
  perfil: PerfilUsuario;
  /** Momento de expiração, em milissegundos desde 1970. */
  expiraEm: number;
};

function assinar(dadosCodificados: string, segredo: string) {
  return createHmac("sha256", segredo).update(dadosCodificados).digest("base64url");
}

/** Cria um token válido por `TOKEN_HORAS` horas. */
export function gerarToken(usuarioId: number, perfil: PerfilUsuario, segredo = env.TOKEN_SECRET, agora = Date.now()) {
  const dados: DadosToken = { usuarioId, perfil, expiraEm: agora + env.TOKEN_HORAS * 60 * 60 * 1000 };
  const dadosCodificados = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return `${dadosCodificados}.${assinar(dadosCodificados, segredo)}`;
}

/** Devolve os dados do token, ou `null` se ele for falso, alterado ou estiver expirado. */
export function lerToken(token: string, segredo = env.TOKEN_SECRET, agora = Date.now()): DadosToken | null {
  const [dadosCodificados, assinatura] = token.split(".");
  if (!dadosCodificados || !assinatura) return null;

  // 1) A assinatura confere?
  const esperada = Buffer.from(assinar(dadosCodificados, segredo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  // 2) Os dados são legíveis e o token ainda está no prazo?
  try {
    const dados = JSON.parse(Buffer.from(dadosCodificados, "base64url").toString()) as DadosToken;
    if (typeof dados.usuarioId !== "number" || dados.expiraEm < agora) return null;
    return dados;
  } catch {
    return null;
  }
}
