/**
 * Rotas dos desafios.
 *   RH:          criar e encerrar (UC14)
 *   Colaborador: participar e registrar progresso (UC08)
 *   Ambos:       listar (cada perfil recebe a sua visão)
 */
import { Router } from "express";
import { autenticar, exigirOnboarding, exigirPerfil } from "../../middlewares/autenticacao.js";
import * as controller from "./desafio.controller.js";

const somenteRh = exigirPerfil("GESTOR_RH");
const somenteColaborador = [exigirPerfil("COLABORADOR"), exigirOnboarding];

export const desafioRoutes = Router();

desafioRoutes.use(autenticar);
desafioRoutes.get("/", controller.listar);
desafioRoutes.post("/", somenteRh, controller.criar);
desafioRoutes.patch("/:id/encerrar", somenteRh, controller.encerrar);
desafioRoutes.post("/:id/participar", ...somenteColaborador, controller.participar);
desafioRoutes.post("/:id/progresso", ...somenteColaborador, controller.registrarProgresso);
