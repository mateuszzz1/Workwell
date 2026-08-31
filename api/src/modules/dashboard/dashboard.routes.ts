import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";

const dashboardController = new DashboardController();

export const dashboardRoutes = Router();

dashboardRoutes.get("/:gestorId", dashboardController.resumo);
