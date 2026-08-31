import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof ZodError) {
    res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: erro.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensagem: issue.message,
      })),
    });
    return;
  }

  if (erro instanceof AppError) {
    res.status(erro.statusCode).json({ erro: erro.message });
    return;
  }

  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
};
