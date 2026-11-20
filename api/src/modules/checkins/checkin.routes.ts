/**
 * Rotas do check-in. Somente colaboradores com onboarding concluído.
 * O RH não tem nenhuma rota para ver check-ins individuais.
 */
import { Router } from "express";
import { autenticar, exigirOnboarding, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./checkin.controller.js";

export const checkinRoutes = Router();

checkinRoutes.use(autenticar, exigirPerfil("COLABORADOR"), exigirOnboarding);
checkinRoutes.get("/resumo", controller.resumo);
checkinRoutes.post("/", controller.salvar);
