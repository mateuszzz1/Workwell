/**
 * Controller de autenticação.
 */
import type { Request, Response } from "express";
import { cadastroSchema, loginSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

/** POST /api/auth/cadastro */
export async function cadastrar(req: Request, res: Response) {
  const dados = cadastroSchema.parse(req.body);
  res.status(201).json(await authService.cadastrar(dados));
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response) {
  const dados = loginSchema.parse(req.body);
  res.json(await authService.login(dados));
}
