/**
 * Controller dos desafios.
 * A mesma rota GET /api/desafios responde de forma diferente para cada perfil.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { idParamSchema } from "../../utils/validacao.js";
import { criarDesafioSchema } from "./desafio.schema.js";
import * as desafioService from "./desafio.service.js";

/** GET /api/desafios */
export async function listar(_req: Request, res: Response) {
  const usuario = usuarioLogado(res);
  const desafios =
    usuario.perfil === "GESTOR_RH"
      ? await desafioService.listarParaRh(usuario)
      : await desafioService.listarParaColaborador(usuario);
  res.json(desafios);
}

/** POST /api/desafios (RH) */
export async function criar(req: Request, res: Response) {
  const dados = criarDesafioSchema.parse(req.body);
  res.status(201).json(await desafioService.criar(usuarioLogado(res), dados));
}

/** PATCH /api/desafios/:id/encerrar (RH) */
export async function encerrar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await desafioService.encerrar(usuarioLogado(res), id));
}

/** POST /api/desafios/:id/participar (colaborador) */
export async function participar(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.status(201).json(await desafioService.participar(usuarioLogado(res), id));
}

/** POST /api/desafios/:id/progresso (colaborador) */
export async function registrarProgresso(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await desafioService.registrarProgresso(usuarioLogado(res), id));
}
