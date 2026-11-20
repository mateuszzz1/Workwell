/**
 * Rotas públicas de autenticação (não exigem token).
 * Após 10 tentativas com erro no mesmo minuto, o IP é bloqueado por 1 minuto
 * (proteção contra força bruta). Logins corretos não contam.
 */
import { Router } from "express";
import { limitarTentativasFalhas } from "../../middlewares/limitar-requisicoes.js";
import * as controller from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.use(limitarTentativasFalhas(10));
authRoutes.post("/cadastro", controller.cadastrar);
authRoutes.post("/login", controller.login);
