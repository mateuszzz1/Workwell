import { Router } from "express";
import { UsuarioController } from "./usuario.controller.js";

const usuarioController = new UsuarioController();

export const usuarioRoutes = Router();

usuarioRoutes.get("/", usuarioController.listar);
usuarioRoutes.post("/", usuarioController.criar);
