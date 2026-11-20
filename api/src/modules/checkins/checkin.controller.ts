/**
 * Controller do check-in diário.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { consultaResumoSchema, salvarCheckinSchema } from "./checkin.schema.js";
import * as checkinService from "./checkin.service.js";

/** GET /api/checkins/resumo?dias=7|30 -> resumo do próprio colaborador. */
export async function resumo(req: Request, res: Response) {
  const { dias } = consultaResumoSchema.parse(req.query);
  res.json(await checkinService.obterResumo(usuarioLogado(res).id, dias));
}

/** POST /api/checkins -> cria (201) ou atualiza (200) o check-in de hoje. */
export async function salvar(req: Request, res: Response) {
  const dados = salvarCheckinSchema.parse(req.body);
  const resultado = await checkinService.salvar(usuarioLogado(res).id, dados);
  res.status(resultado.criado ? 201 : 200).json(resultado);
}
