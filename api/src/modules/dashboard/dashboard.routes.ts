/**
 * Rotas do painel. Somente gestores de RH, e só da própria empresa
 * (a empresa vem do token, não da URL).
 */
import { Router } from "express";
import { autenticar, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(autenticar, exigirPerfil("GESTOR_RH"));
dashboardRoutes.get("/", controller.resumo);
