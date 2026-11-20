/**
 * Tratamento central de erros.
 *
 * Todo erro lançado em rotas, middlewares ou services chega aqui
 * (o Express 5 captura inclusive erros de funções `async`).
 *
 * - ZodError  -> 400, com a lista de campos inválidos;
 * - AppError  -> o código e a mensagem definidos pela regra de negócio;
 * - JSON malformado ou grande demais -> 400 / 413 (erro de quem enviou);
 * - outros    -> 500 genérico. O detalhe vai só para o log do servidor,
 *                para não expor informações internas ao usuário.
 */
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

  // Erros do leitor de JSON do Express (corpo inválido ou acima de 100 KB).
  if (erro?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "O corpo da requisição não é um JSON válido." });
    return;
  }
  if (erro?.type === "entity.too.large") {
    res.status(413).json({ erro: "Os dados enviados são grandes demais." });
    return;
  }

  if (erro instanceof AppError) {
    res.status(erro.statusCode).json({ erro: erro.message });
    return;
  }

  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
};
