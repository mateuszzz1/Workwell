import type { Request, Response } from "express";
import { criarUsuarioSchema } from "./usuario.schema.js";
import { UsuarioService } from "./usuario.service.js";

const usuarioService = new UsuarioService();

export class UsuarioController {
  listar = async (_req: Request, res: Response) => {
    const usuarios = await usuarioService.listar();
    res.json(usuarios);
  };

  criar = async (req: Request, res: Response) => {
    const dados = criarUsuarioSchema.parse(req.body);
    const usuario = await usuarioService.criar(dados);
    res.status(201).json(usuario);
  };
}
