/**
 * Mapa da API: liga cada caminho ao módulo responsável.
 *
 * Cada módulo (pasta em src/modules) segue a mesma estrutura:
 *   *.routes.ts      -> quais URLs existem e quem pode acessá-las
 *   *.controller.ts  -> lê a requisição, valida e responde
 *   *.schema.ts      -> regras de validação dos dados de entrada (Zod)
 *   *.service.ts     -> regras de negócio e acesso ao banco (Prisma)
 *   *.regras.ts      -> cálculos puros, sem banco (testados em /tests)
 */
import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { checkinRoutes } from "../modules/checkins/checkin.routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes.js";
import { desafioRoutes } from "../modules/desafios/desafio.routes.js";
import { gamificacaoRoutes } from "../modules/gamificacao/gamificacao.routes.js";
import { habitoRoutes } from "../modules/habitos/habito.routes.js";
import { lembreteRoutes } from "../modules/lembretes/lembrete.routes.js";
import { healthRoutes } from "../modules/health/health.routes.js";
import { usuarioRoutes } from "../modules/usuarios/usuario.routes.js";

export const routes = Router();

routes.get("/", (_req, res) => {
  res.json({ projeto: "WorkWell", documentacao: "Consulte docs/API.md" });
});

routes.use("/health", healthRoutes); // estado da API e do banco
routes.use("/auth", authRoutes); // cadastro e login (UC01, UC02)
routes.use("/usuarios", usuarioRoutes); // perfil e onboarding (UC01, UC03)
routes.use("/checkins", checkinRoutes); // check-in diário (UC04, UC07)
routes.use("/habitos", habitoRoutes); // metas, hábitos e lembretes (UC05, UC06, UC09)
routes.use("/lembretes", lembreteRoutes); // lembretes de pausa, descanso e check-in (UC09)
routes.use("/desafios", desafioRoutes); // desafios (UC08, UC14)
routes.use("/gamificacao", gamificacaoRoutes); // pontos e medalhas (UC10)
routes.use("/dashboard", dashboardRoutes); // painel agregado do RH (UC11)
