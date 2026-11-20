/**
 * Rotas da gamificação. Somente colaboradores acumulam pontos e medalhas.
 */
import { Router } from "express";
import { autenticar, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./gamificacao.controller.js";

export const gamificacaoRoutes = Router();

gamificacaoRoutes.use(autenticar, exigirPerfil("COLABORADOR"));
gamificacaoRoutes.get("/me", controller.meuResumo);
