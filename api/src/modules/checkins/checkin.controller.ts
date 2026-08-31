import type { Request, Response } from "express";
import {
  salvarCheckinSchema,
  usuarioIdParamsSchema,
} from "./checkin.schema.js";
import { CheckinService } from "./checkin.service.js";

const checkinService = new CheckinService();

export class CheckinController {
  resumo = async (req: Request, res: Response) => {
    const { usuarioId } = usuarioIdParamsSchema.parse(req.params);
    const resumo = await checkinService.obterResumo(usuarioId);
    res.json(resumo);
  };

  salvar = async (req: Request, res: Response) => {
    const dados = salvarCheckinSchema.parse(req.body);
    const resultado = await checkinService.salvar(dados);
    res.status(resultado.criado ? 201 : 200).json(resultado);
  };
}
