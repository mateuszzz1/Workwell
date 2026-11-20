/**
 * Controller de usuários.
 *
 * Padrão seguido por todos os controllers do projeto:
 *   1. valida a entrada com o schema Zod (se falhar -> 400 automático);
 *   2. pega o usuário logado a partir do token;
 *   3. chama o service e devolve a resposta em JSON.
 * O controller não tem regra de negócio: ela fica no service.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { onboardingSchema, perfilSchema } from "./usuario.schema.js";
import * as usuarioService from "./usuario.service.js";

/** GET /api/usuarios/me */
export async function meuPerfil(_req: Request, res: Response) {
  res.json(await usuarioService.buscarPerfil(usuarioLogado(res).id));
}

/** PUT /api/usuarios/me */
export async function atualizarPerfil(req: Request, res: Response) {
  const dados = perfilSchema.parse(req.body);
  res.json(await usuarioService.atualizarPerfil(usuarioLogado(res).id, dados));
}

/** GET /api/usuarios/onboarding/opcoes */
export function opcoesOnboarding(_req: Request, res: Response) {
  res.json(usuarioService.opcoesOnboarding());
}

/** POST /api/usuarios/me/onboarding */
export async function concluirOnboarding(req: Request, res: Response) {
  const dados = onboardingSchema.parse(req.body);
  res.json(await usuarioService.concluirOnboarding(usuarioLogado(res).id, dados));
}
