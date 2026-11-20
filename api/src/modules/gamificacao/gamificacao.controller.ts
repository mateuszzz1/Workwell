/**
 * Controller da gamificação: recebe a requisição e chama o service.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import * as gamificacaoService from "./gamificacao.service.js";

/** GET /api/gamificacao/me -> pontos e medalhas do usuário logado. */
export async function meuResumo(_req: Request, res: Response) {
  res.json(await gamificacaoService.obterResumo(usuarioLogado(res).id));
}
