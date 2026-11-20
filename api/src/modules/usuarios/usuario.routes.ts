/**
 * Rotas de usuários. Todas exigem login e atuam apenas sobre o próprio usuário ("me").
 */
import { Router } from "express";
import { autenticar, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./usuario.controller.js";

export const usuarioRoutes = Router();

usuarioRoutes.use(autenticar);
usuarioRoutes.get("/me", controller.meuPerfil);
usuarioRoutes.put("/me", exigirPerfil("COLABORADOR"), controller.atualizarPerfil);
usuarioRoutes.get("/onboarding/opcoes", controller.opcoesOnboarding);
usuarioRoutes.post("/me/onboarding", exigirPerfil("COLABORADOR"), controller.concluirOnboarding);
