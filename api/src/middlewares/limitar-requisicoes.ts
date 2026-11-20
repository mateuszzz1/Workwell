/**
 * Limite de tentativas FALHAS por IP.
 *
 * Protege o login e o cadastro contra tentativas em massa (força bruta).
 * Só contam as respostas com erro (ex.: senha errada); logins bem-sucedidos
 * não contam. Isso importa numa empresa, onde muitas pessoas saem pelo mesmo
 * IP da rede corporativa e não podem bloquear umas às outras.
 *
 * Depois de `maximo` falhas no mesmo minuto, o IP recebe 429 até o minuto acabar.
 * Os contadores ficam na memória: simples e suficiente para um servidor só.
 */
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

const UM_MINUTO = 60_000;

export function limitarTentativasFalhas(maximo: number) {
  const falhas = new Map<string, { quantidade: number; expiraEm: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const agora = Date.now();

    // Remove contadores vencidos para a memória não crescer sem limite.
    for (const [ip, contador] of falhas) {
      if (contador.expiraEm < agora) falhas.delete(ip);
    }

    const ip = req.ip ?? "desconhecido";
    if ((falhas.get(ip)?.quantidade ?? 0) >= maximo) {
      res.setHeader("Retry-After", "60");
      throw new AppError("Muitas tentativas. Aguarde um minuto e tente novamente.", 429);
    }

    // Quando a resposta terminar, conta a tentativa se ela falhou.
    res.on("finish", () => {
      if (res.statusCode < 400) return;
      const contador = falhas.get(ip) ?? { quantidade: 0, expiraEm: Date.now() + UM_MINUTO };
      contador.quantidade += 1;
      falhas.set(ip, contador);
    });

    next();
  };
}
