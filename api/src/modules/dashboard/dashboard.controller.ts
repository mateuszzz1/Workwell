import type { Request, Response } from "express";
import { gestorIdParamsSchema } from "./dashboard.schema.js";
import { DashboardService } from "./dashboard.service.js";

const dashboardService = new DashboardService();

export class DashboardController {
  resumo = async (req: Request, res: Response) => {
    const { gestorId } = gestorIdParamsSchema.parse(req.params);
    const resumo = await dashboardService.obterResumo(gestorId);
    res.json(resumo);
  };
}
