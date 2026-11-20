/**
 * Controller do painel do RH.
 */
import type { Request, Response } from "express";
import { usuarioLogado } from "../../middlewares/autenticacao.js";
import { filtrosDashboardSchema } from "./dashboard.schema.js";
import * as dashboardService from "./dashboard.service.js";

/** GET /api/dashboard?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&setor=Tecnologia */
export async function resumo(req: Request, res: Response) {
  const filtros = filtrosDashboardSchema.parse(req.query);
  res.json(await dashboardService.obterResumo(usuarioLogado(res), filtros));
}
