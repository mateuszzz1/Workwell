/**
 * Middlewares de autenticação e autorização.
 *
 * - `autenticar`: descobre QUEM está fazendo a requisição (pelo token).
 * - `exigirPerfil`: verifica se essa pessoa PODE usar a rota (pelo perfil).
 * - `exigirOnboarding`: exige que o colaborador tenha concluído o onboarding (UC03).
 *
 * Uso nas rotas:
 *   rotas.get("/painel", autenticar, exigirPerfil("GESTOR_RH"), controller.painel);
 *
 * Importante: o id do usuário vem SEMPRE do token, nunca da URL ou do corpo.
 * Assim um colaborador não consegue pedir os dados de outra pessoa trocando
 * um número na requisição.
 */
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { PerfilUsuario } from "../generated/prisma/enums.js";
import { lerToken } from "../utils/token.js";

/** Dados do usuário logado, disponíveis nos controllers via `usuarioLogado(res)`. */
export type UsuarioLogado = {
  id: number;
  perfil: PerfilUsuario;
  empresaId: number;
  onboardingConcluido: boolean;
};

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  const dados = lerToken(token);

  if (!dados) {
    throw new AppError("Faça login para continuar.", 401);
  }

  // Confere no banco se o usuário ainda existe e está ativo
  // (um usuário desativado perde o acesso mesmo com token válido).
  const usuario = await prisma.usuario.findUnique({
    where: { id: dados.usuarioId },
    select: { id: true, perfil: true, empresaId: true, ativo: true, onboardingConcluido: true },
  });

  if (!usuario?.ativo) {
    throw new AppError("Sua sessão não é mais válida. Faça login novamente.", 401);
  }

  const logado: UsuarioLogado = {
    id: usuario.id,
    perfil: usuario.perfil,
    empresaId: usuario.empresaId,
    onboardingConcluido: usuario.onboardingConcluido,
  };
  res.locals["usuario"] = logado;
  // Dados pessoais não devem ficar guardados em cache do navegador ou de proxies.
  res.setHeader("Cache-Control", "no-store");
  next();
}

/** Bloqueia a rota para quem não tem um dos perfis informados. */
export function exigirPerfil(...perfis: PerfilUsuario[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!perfis.includes(usuarioLogado(res).perfil)) {
      throw new AppError("Seu perfil não tem acesso a este recurso.", 403);
    }
    next();
  };
}

/**
 * O check-in e os hábitos pressupõem o onboarding concluído (pré-condição do UC04).
 * Use depois de `autenticar`.
 */
export function exigirOnboarding(_req: Request, res: Response, next: NextFunction) {
  if (!usuarioLogado(res).onboardingConcluido) {
    throw new AppError("Conclua o onboarding para usar este recurso.", 403);
  }
  next();
}

/** Lê o usuário que o middleware `autenticar` guardou na resposta. */
export function usuarioLogado(res: Response): UsuarioLogado {
  const usuario = res.locals["usuario"] as UsuarioLogado | undefined;
  if (!usuario) throw new AppError("Faça login para continuar.", 401);
  return usuario;
}
