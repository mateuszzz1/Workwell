/**
 * Montagem da aplicação Express.
 *
 * A ordem dos `app.use` importa: cada requisição passa por eles de cima para baixo.
 *   1. CORS        -> só o frontend configurado pode chamar a API pelo navegador;
 *   2. JSON        -> transforma o corpo da requisição em objeto (limite de 100 KB);
 *   3. /api        -> rotas de cada módulo (routes/index.ts);
 *   4. 404         -> nenhuma rota respondeu;
 *   5. erros       -> qualquer erro lançado acima cai no tratamento central.
 *
 * Este arquivo NÃO abre a porta (isso fica no server.ts). Assim os testes
 * conseguem subir a aplicação numa porta aleatória.
 */
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { routes } from "./routes/index.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "100kb" }));

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use(errorHandler);
