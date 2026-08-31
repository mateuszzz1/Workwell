import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import { PerfilUsuario } from "../../generated/prisma/enums.js";
import { adicionarDias, dataLocal } from "../../utils/data.js";
import type { SalvarCheckinInput } from "./checkin.schema.js";

export class CheckinService {
  async obterResumo(usuarioId: number) {
    await this.validarColaborador(usuarioId);

    const hoje = dataLocal();
    const inicio = adicionarDias(hoje, -6);
    const checkins = await prisma.checkin.findMany({
      where: { usuarioId, data: { gte: inicio, lte: hoje } },
      orderBy: { data: "asc" },
      select: {
        id: true,
        data: true,
        humor: true,
        energia: true,
        sono: true,
        estresse: true,
        observacao: true,
      },
    });

    const checkinHoje = checkins.find(
      (checkin) => checkin.data.getTime() === hoje.getTime(),
    );

    return {
      hoje: hoje.toISOString().slice(0, 10),
      checkinHoje: checkinHoje ?? null,
      historico: checkins,
      sequencia: this.calcularSequencia(checkins.map((checkin) => checkin.data)),
      medias: {
        humor: this.media(checkins.map((checkin) => checkin.humor)),
        energia: this.media(checkins.map((checkin) => checkin.energia)),
        sono: this.media(
          checkins.flatMap((checkin) =>
            checkin.sono === null ? [] : [checkin.sono],
          ),
        ),
        estresse: this.media(
          checkins.flatMap((checkin) =>
            checkin.estresse === null ? [] : [checkin.estresse],
          ),
        ),
      },
    };
  }

  async salvar(dados: SalvarCheckinInput) {
    await this.validarColaborador(dados.usuarioId);

    const hoje = dataLocal();
    const existente = await prisma.checkin.findUnique({
      where: { usuarioId_data: { usuarioId: dados.usuarioId, data: hoje } },
      select: { id: true },
    });

    const resultado = await prisma.$transaction(async (tx) => {
      const checkin = await tx.checkin.upsert({
        where: { usuarioId_data: { usuarioId: dados.usuarioId, data: hoje } },
        update: {
          humor: dados.humor,
          energia: dados.energia,
          sono: dados.sono ?? null,
          estresse: dados.estresse ?? null,
          observacao: dados.observacao || null,
        },
        create: {
          usuarioId: dados.usuarioId,
          data: hoje,
          humor: dados.humor,
          energia: dados.energia,
          sono: dados.sono ?? null,
          estresse: dados.estresse ?? null,
          observacao: dados.observacao || null,
        },
      });

      if (!existente) {
        await tx.usuario.update({
          where: { id: dados.usuarioId },
          data: { pontosTotal: { increment: 10 } },
        });

        const medalha = await tx.medalha.findUnique({
          where: { nome: "Primeiro passo" },
          select: { id: true },
        });

        if (medalha) {
          await tx.conquistaMedalha.upsert({
            where: {
              usuarioId_medalhaId: {
                usuarioId: dados.usuarioId,
                medalhaId: medalha.id,
              },
            },
            update: {},
            create: { usuarioId: dados.usuarioId, medalhaId: medalha.id },
          });
        }
      }

      return checkin;
    });

    return {
      checkin: resultado,
      criado: !existente,
      pontosGanhos: existente ? 0 : 10,
      mensagem: existente
        ? "Check-in de hoje atualizado."
        : "Check-in registrado. Você ganhou 10 pontos!",
    };
  }

  private async validarColaborador(usuarioId: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfil: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      throw new AppError("Colaborador não encontrado.", 404);
    }

    if (usuario.perfil !== PerfilUsuario.COLABORADOR) {
      throw new AppError("Este perfil não pode realizar check-ins.", 403);
    }
  }

  private media(valores: number[]) {
    if (valores.length === 0) return null;
    const total = valores.reduce((soma, valor) => soma + valor, 0);
    return Number((total / valores.length).toFixed(1));
  }

  private calcularSequencia(datas: Date[]) {
    if (datas.length === 0) return 0;

    const dias = new Set(datas.map((data) => data.toISOString().slice(0, 10)));
    let cursor = dataLocal();
    if (!dias.has(cursor.toISOString().slice(0, 10))) {
      cursor = adicionarDias(cursor, -1);
    }

    let sequencia = 0;
    while (dias.has(cursor.toISOString().slice(0, 10))) {
      sequencia += 1;
      cursor = adicionarDias(cursor, -1);
    }
    return sequencia;
  }
}
