/**
 * Rotas dos hábitos. Somente colaboradores logados e com onboarding concluído.
 */
import { Router } from "express";
import { autenticar, exigirOnboarding, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./habito.controller.js";

export const habitoRoutes = Router();

habitoRoutes.use(autenticar, exigirPerfil("COLABORADOR"), exigirOnboarding);
habitoRoutes.get("/", controller.listar);
habitoRoutes.post("/", controller.criar);
habitoRoutes.get("/:id", controller.detalhe);
habitoRoutes.put("/:id", controller.editar);
habitoRoutes.delete("/:id", controller.excluir);
habitoRoutes.put("/:id/registro", controller.registrar);
