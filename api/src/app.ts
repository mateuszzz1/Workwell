/**
 * Montagem da aplicação Express.
 *
 * A ordem dos `app.use` importa: cada requisição passa por eles de cima para baixo.
 *   1. CORS        -> só o frontend configurado pode chamar a API pelo navegador;
 *   2. JSON        -> transforma o corpo da requisição em objeto (limite de 100 KB);
 *   3. /api        -> rotas de cada módulo (routes/index.ts);
 *   4. site        -> em produção, entrega as páginas do React já compiladas (web/dist);
 *   5. 404         -> nenhuma rota respondeu;
 *   6. erros       -> qualquer erro lançado acima cai no tratamento central.
 *
 * Este arquivo NÃO abre a porta (isso fica no server.ts). Assim os testes
 * conseguem subir a aplicação numa porta aleatória.
 */
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { routes } from "./routes/index.js";

export const app = express();

// Na hospedagem (Railway), as requisições passam por um proxy. Sem esta linha,
// todo mundo apareceria com o IP do proxy e o limite de tentativas de login
// bloquearia todas as pessoas juntas.
if (env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "100kb" }));

app.use("/api", routes);

// Site compilado (npm run build na pasta web). Em desenvolvimento quem serve o
// site é o Vite (porta 5173); em produção, a própria API serve tudo num endereço só.
const pastaSite = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(pastaSite)) {
  app.use(express.static(pastaSite));
  // Qualquer endereço que não seja da API devolve o index.html (o React decide a tela).
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile("index.html", { root: pastaSite });
  });
}

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use(errorHandler);
