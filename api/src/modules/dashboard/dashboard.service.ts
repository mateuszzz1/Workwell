import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import { PerfilUsuario } from "../../generated/prisma/enums.js";
import { adicionarDias, chaveData, dataLocal } from "../../utils/data.js";

const LIMIAR_MINIMO = 5;

export class DashboardService {
  async obterResumo(gestorId: number) {
    const gestor = await prisma.usuario.findUnique({
      where: { id: gestorId },
      select: {
        id: true,
        nome: true,
        perfil: true,
        ativo: true,
        empresa: { select: { id: true, nome: true } },
      },
    });

    if (!gestor || !gestor.ativo) {
      throw new AppError("Gestor de RH não encontrado.", 404);
    }
    if (gestor.perfil !== PerfilUsuario.GESTOR_RH) {
      throw new AppError("Este perfil não possui acesso ao painel de RH.", 403);
    }

    const hoje = dataLocal();
    const inicio = adicionarDias(hoje, -6);
    const colaboradores = await prisma.usuario.count({
      where: {
        empresaId: gestor.empresa.id,
        perfil: PerfilUsuario.COLABORADOR,
        ativo: true,
      },
    });

    if (colaboradores < LIMIAR_MINIMO) {
      return {
        gestor: { id: gestor.id, nome: gestor.nome },
        empresa: gestor.empresa,
        privacidade: {
          dadosDisponiveis: false,
          limiarMinimo: LIMIAR_MINIMO,
          mensagem: `São necessários ao menos ${LIMIAR_MINIMO} colaboradores para exibir dados agregados.`,
        },
      };
    }

    const checkins = await prisma.checkin.findMany({
      where: {
        data: { gte: inicio, lte: hoje },
        usuario: {
          empresaId: gestor.empresa.id,
          perfil: PerfilUsuario.COLABORADOR,
          ativo: true,
        },
      },
      select: {
        data: true,
        usuarioId: true,
        humor: true,
        energia: true,
        sono: true,
        estresse: true,
      },
    });

    const participantes = new Set(checkins.map((checkin) => checkin.usuarioId));
    const taxaEngajamento = (checkins.length / (colaboradores * 7)) * 100;
    const dias = Array.from({ length: 7 }, (_, indice) =>
      adicionarDias(inicio, indice),
    );

    const tendencia = dias.map((data) => {
      const registros = checkins.filter(
        (checkin) => chaveData(checkin.data) === chaveData(data),
      );
      return {
        data: chaveData(data),
        participantes: new Set(registros.map((registro) => registro.usuarioId))
          .size,
        humor: this.media(registros.map((registro) => registro.humor)),
        energia: this.media(registros.map((registro) => registro.energia)),
      };
    });

    return {
      gestor: { id: gestor.id, nome: gestor.nome },
      empresa: gestor.empresa,
      periodo: { inicio: chaveData(inicio), fim: chaveData(hoje), dias: 7 },
      privacidade: {
        dadosDisponiveis: true,
        limiarMinimo: LIMIAR_MINIMO,
        mensagem: "Indicadores agregados e anônimos; nenhum registro individual é retornado.",
      },
      indicadores: {
        colaboradores,
        participantes: participantes.size,
        taxaEngajamento: Number(taxaEngajamento.toFixed(1)),
        humorMedio: this.media(checkins.map((checkin) => checkin.humor)),
        energiaMedia: this.media(checkins.map((checkin) => checkin.energia)),
        sonoMedio: this.media(
          checkins.flatMap((checkin) =>
            checkin.sono === null ? [] : [checkin.sono],
          ),
        ),
        estresseMedio: this.media(
          checkins.flatMap((checkin) =>
            checkin.estresse === null ? [] : [checkin.estresse],
          ),
        ),
      },
      tendencia,
    };
  }

  private media(valores: number[]) {
    if (valores.length === 0) return null;
    return Number(
      (valores.reduce((soma, valor) => soma + valor, 0) / valores.length).toFixed(
        1,
      ),
    );
  }
}
