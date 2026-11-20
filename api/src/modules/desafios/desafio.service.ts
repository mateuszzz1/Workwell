/**
 * Desafios da empresa.
 *
 * - UC14 (Gestor de RH): criar, listar e encerrar desafios. O RH vê apenas
 *   números agregados (quantos participam / concluíram), nunca nomes.
 * - UC08 (Colaborador): ver desafios abertos, participar e registrar progresso.
 * - UC10: concluir um desafio dá os pontos de recompensa e a medalha "Desafiante".
 */
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import type { UsuarioLogado } from "../../middlewares/autenticacao.js";
import { chaveData, dataDeTexto, dataLocal } from "../../utils/data.js";
import { MEDALHAS } from "../gamificacao/gamificacao.regras.js";
import { adicionarPontos, concederMedalha } from "../gamificacao/gamificacao.service.js";
import { aplicarRegistro, desafioAberto, motivoParaNaoRegistrar } from "./desafio.regras.js";
import type { CriarDesafioInput } from "./desafio.schema.js";

/** Formato comum de um desafio nas respostas da API. */
function apresentarDesafio(desafio: {
  id: number;
  titulo: string;
  descricao: string | null;
  dataInicio: Date;
  dataFim: Date;
  metaRegistros: number;
  pontosRecompensa: number;
  status: "ATIVO" | "ENCERRADO";
}) {
  return {
    id: desafio.id,
    titulo: desafio.titulo,
    descricao: desafio.descricao,
    dataInicio: chaveData(desafio.dataInicio),
    dataFim: chaveData(desafio.dataFim),
    metaRegistros: desafio.metaRegistros,
    pontosRecompensa: desafio.pontosRecompensa,
    status: desafio.status,
    aberto: desafioAberto(desafio, dataLocal()),
  };
}

/** Busca um desafio da MESMA empresa do usuário (ou responde 404). */
async function buscarDesafio(usuario: UsuarioLogado, id: number) {
  const desafio = await prisma.desafio.findFirst({ where: { id, empresaId: usuario.empresaId } });
  if (!desafio) throw new AppError("Desafio não encontrado.", 404);
  return desafio;
}

// ---------------------------------------------------------------------------
// Gestor de RH (UC14)
// ---------------------------------------------------------------------------

/** Todos os desafios da empresa, com contagens agregadas de adesão. */
export async function listarParaRh(usuario: UsuarioLogado) {
  const desafios = await prisma.desafio.findMany({
    where: { empresaId: usuario.empresaId },
    orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
    include: { participacoes: { select: { concluido: true } } },
  });

  return desafios.map((desafio) => ({
    ...apresentarDesafio(desafio),
    participantes: desafio.participacoes.length,
    concluidos: desafio.participacoes.filter((participacao) => participacao.concluido).length,
  }));
}

export async function criar(usuario: UsuarioLogado, dados: CriarDesafioInput) {
  if (dataDeTexto(dados.dataFim) < dataLocal()) {
    throw new AppError("A data final não pode estar no passado.");
  }

  const desafio = await prisma.desafio.create({
    data: {
      empresaId: usuario.empresaId,
      criadoPorId: usuario.id,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      dataInicio: dataDeTexto(dados.dataInicio),
      dataFim: dataDeTexto(dados.dataFim),
      metaRegistros: dados.metaRegistros,
      pontosRecompensa: dados.pontosRecompensa,
    },
  });
  return { ...apresentarDesafio(desafio), participantes: 0, concluidos: 0 };
}

export async function encerrar(usuario: UsuarioLogado, id: number) {
  await buscarDesafio(usuario, id);
  const desafio = await prisma.desafio.update({ where: { id }, data: { status: "ENCERRADO" } });
  return apresentarDesafio(desafio);
}

// ---------------------------------------------------------------------------
// Colaborador (UC08)
// ---------------------------------------------------------------------------

/** Desafios ativos da empresa, com a participação do próprio colaborador. */
export async function listarParaColaborador(usuario: UsuarioLogado) {
  const desafios = await prisma.desafio.findMany({
    where: { empresaId: usuario.empresaId, status: "ATIVO", dataFim: { gte: dataLocal() } },
    orderBy: { dataFim: "asc" },
    include: {
      // Só a participação de quem está pedindo; nunca a dos colegas.
      participacoes: { where: { usuarioId: usuario.id } },
      _count: { select: { participacoes: true } },
    },
  });

  const hoje = dataLocal();
  return desafios.map((desafio) => {
    const minha = desafio.participacoes[0];
    return {
      ...apresentarDesafio(desafio),
      participantes: desafio._count.participacoes,
      participacao: minha
        ? {
            progresso: minha.progresso,
            concluido: minha.concluido,
            registradoHoje: !!minha.ultimoRegistro && chaveData(minha.ultimoRegistro) === chaveData(hoje),
          }
        : null,
    };
  });
}

export async function participar(usuario: UsuarioLogado, id: number) {
  const desafio = await buscarDesafio(usuario, id);
  if (desafio.status !== "ATIVO" || desafio.dataFim < dataLocal()) {
    throw new AppError("Este desafio não aceita novas participações.");
  }

  const existente = await prisma.participacaoDesafio.findUnique({
    where: { usuarioId_desafioId: { usuarioId: usuario.id, desafioId: id } },
  });
  if (existente) throw new AppError("Você já participa deste desafio.", 409);

  await prisma.participacaoDesafio.create({ data: { usuarioId: usuario.id, desafioId: id } });
  return { mensagem: "Você entrou no desafio. Bom começo!" };
}

/** Registra o "fiz hoje"; ao atingir a meta, conclui e concede a recompensa. */
export async function registrarProgresso(usuario: UsuarioLogado, id: number) {
  const desafio = await buscarDesafio(usuario, id);
  const hoje = dataLocal();

  return prisma.$transaction(async (tx) => {
    const participacao = await tx.participacaoDesafio.findUnique({
      where: { usuarioId_desafioId: { usuarioId: usuario.id, desafioId: id } },
    });
    if (!participacao) throw new AppError("Entre no desafio antes de registrar.", 409);

    const motivo = motivoParaNaoRegistrar(desafio, participacao, hoje);
    if (motivo) throw new AppError(motivo, 409);

    const { progresso, concluido } = aplicarRegistro(participacao.progresso, desafio.metaRegistros);
    await tx.participacaoDesafio.update({
      where: { usuarioId_desafioId: { usuarioId: usuario.id, desafioId: id } },
      data: { progresso, concluido, ultimoRegistro: hoje, dataConclusao: concluido ? new Date() : null },
    });

    if (!concluido) {
      return { progresso, concluido, pontosGanhos: 0, medalhasNovas: [], mensagem: "Progresso registrado." };
    }

    // Desafio concluído: recompensa (UC10).
    await adicionarPontos(tx, usuario.id, desafio.pontosRecompensa);
    const medalhasNovas = (await concederMedalha(tx, usuario.id, "DESAFIANTE")) ? [MEDALHAS.DESAFIANTE.nome] : [];
    return {
      progresso,
      concluido,
      pontosGanhos: desafio.pontosRecompensa,
      medalhasNovas,
      mensagem: `Desafio concluído! Você ganhou ${desafio.pontosRecompensa} pontos.`,
    };
    // Serializable: dois cliques simultâneos não conseguem registrar duas vezes no mesmo dia.
  }, { isolationLevel: "Serializable" });
}
