/**
 * Controller dos hábitos. O dono é sempre o usuário do token.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { idParamSchema } from "../../utils/validacao.js";
import { consultaSchema, habitoSchema, importacaoSchema, registroSchema } from "./habito.schema.js";
import * as habitoService from "./habito.service.js";

/** GET /api/habitos?data=AAAA-MM-DD */
export async function listar(req: Request, res: Response) {
  const { data } = consultaSchema.parse(req.query);
  res.json(await habitoService.listar(usuarioLogado(res).id, data));
}

/** GET /api/habitos/:id?data=AAAA-MM-DD */
export async function detalhe(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const { data } = consultaSchema.parse(req.query);
  res.json(await habitoService.detalhe(usuarioLogado(res).id, id, data));
}

/** POST /api/habitos */
export async function criar(req: Request, res: Response) {
  const dados = habitoSchema.parse(req.body);
  res.status(201).json(await habitoService.criar(usuarioLogado(res).id, dados));
}

/** PUT /api/habitos/:id */
export async function editar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const dados = habitoSchema.parse(req.body);
  res.json(await habitoService.editar(usuarioLogado(res).id, id, dados));
}

/** PUT /api/habitos/:id/registro */
export async function registrar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const dados = registroSchema.parse(req.body);
  res.json(await habitoService.registrar(usuarioLogado(res).id, id, dados));
}

/** DELETE /api/habitos/:id */
export async function excluir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await habitoService.excluir(usuarioLogado(res).id, id));
}

/** POST /api/habitos/importacao */
export async function importar(req: Request, res: Response) {
  const dados = importacaoSchema.parse(req.body);
  res.json(await habitoService.importar(usuarioLogado(res).id, dados));
}
