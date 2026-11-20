/**
 * Rotas dos lembretes (UC09). Somente colaboradores com onboarding concluído.
 */
import { Router } from "express";
import { autenticar, exigirOnboarding, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./lembrete.controller.js";

export const lembreteRoutes = Router();

lembreteRoutes.use(autenticar, exigirPerfil("COLABORADOR"), exigirOnboarding);
lembreteRoutes.get("/", controller.listar);
lembreteRoutes.get("/pendentes", controller.pendentes);
lembreteRoutes.post("/", controller.criar);
lembreteRoutes.put("/:id", controller.editar);
lembreteRoutes.delete("/:id", controller.excluir);
lembreteRoutes.post("/:id/adiar", controller.adiar);
lembreteRoutes.post("/:id/dispensar", controller.dispensar);
