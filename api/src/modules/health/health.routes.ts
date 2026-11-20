/**
 * GET /api/health -> confirma que a API está no ar e consegue falar com o banco.
 * Útil para testar a instalação e para monitoramento.
 */
import { Router } from "express";
import { prisma } from "../../database/prisma.js";

export const healthRoutes = Router();

healthRoutes.get("/", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`; // se o banco estiver fora, cai no erro 500

  res.json({
    status: "ok",
    servico: "workwell-api",
    banco: "conectado",
    horario: new Date().toISOString(),
  });
});
