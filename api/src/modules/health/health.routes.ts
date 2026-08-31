import { Router } from "express";
import { prisma } from "../../database/prisma.js";

export const healthRoutes = Router();

healthRoutes.get("/", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    status: "ok",
    servico: "workwell-api",
    banco: "conectado",
    horario: new Date().toISOString(),
  });
});
