/**
 * Controller dos lembretes de pausa, descanso e check-in.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { idParamSchema } from "../../utils/validacao.js";
import { adiarSchema, lembreteSchema } from "./lembrete.schema.js";
import * as lembreteService from "./lembrete.service.js";

/** GET /api/lembretes */
export async function listar(_req: Request, res: Response) {
  res.json(await lembreteService.listar(usuarioLogado(res).id));
}

/** GET /api/lembretes/pendentes -> avisos que devem aparecer agora */
export async function pendentes(_req: Request, res: Response) {
  res.json(await lembreteService.pendentes(usuarioLogado(res).id));
}

/** POST /api/lembretes */
export async function criar(req: Request, res: Response) {
  const dados = lembreteSchema.parse(req.body);
  res.status(201).json(await lembreteService.criar(usuarioLogado(res).id, dados));
}

/** PUT /api/lembretes/:id */
export async function editar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const dados = lembreteSchema.parse(req.body);
  res.json(await lembreteService.editar(usuarioLogado(res).id, id, dados));
}

/** DELETE /api/lembretes/:id */
export async function excluir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await lembreteService.excluir(usuarioLogado(res).id, id));
}

/** POST /api/lembretes/:id/adiar  { minutos } */
export async function adiar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const { minutos } = adiarSchema.parse(req.body);
  res.json(await lembreteService.adiar(usuarioLogado(res).id, id, minutos));
}

/** POST /api/lembretes/:id/dispensar */
export async function dispensar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await lembreteService.dispensar(usuarioLogado(res).id, id));
}
