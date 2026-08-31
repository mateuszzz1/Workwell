import { Router } from "express";
import { CheckinController } from "./checkin.controller.js";

const checkinController = new CheckinController();

export const checkinRoutes = Router();

checkinRoutes.get("/usuario/:usuarioId/resumo", checkinController.resumo);
checkinRoutes.post("/", checkinController.salvar);
