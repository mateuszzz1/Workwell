/**
 * Gestão de hábitos e rotina (UC05 metas, UC06 registro, UC07 progresso, UC09 lembretes).
 *
 * No banco, cada hábito do colaborador é uma `Meta` ligada a uma categoria
 * (`Habito`). O progresso diário fica em `RegistroHabito` e os horários de
 * lembrete em `Lembrete`. Toda consulta filtra por `usuarioId` do token:
 * ninguém acessa hábitos de outra pessoa.
 */
import { prisma, type Transacao } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { adicionarDias, chaveData, dataDeTexto, dataLocal } from "../../utils/data.js";
import { PONTOS } from "../gamificacao/gamificacao.regras.js";
import { adicionarPontos } from "../gamificacao/gamificacao.service.js";
import { agendado, diasDoPeriodo, resumirPeriodo, situacao } from "./habito.regras.js";
import type { HabitoInput, ImportacaoInput, RegistroInput } from "./habito.schema.js";

/** Limite de hábitos ativos por colaborador. */
const MAXIMO_HABITOS = 30;

/** Ícone escolhido na tela -> categoria salva no banco. */
const CATEGORIA_DO_ICONE = {
  water: "HIDRATACAO",
  sleep: "SONO",
  exercise: "ATIVIDADE_FISICA",
  coffee: "PAUSA",
  meditation: "MEDITACAO",
  custom: "PERSONALIZADO",
} as const;

/** Para hábitos antigos sem ícone: categoria -> ícone. */
const ICONE_DA_CATEGORIA: Record<string, string> = {
  SONO: "sleep",
  ATIVIDADE_FISICA: "exercise",
  PAUSA: "coffee",
  ESTRESSE: "meditation",
  ALIMENTACAO: "custom",
  HIDRATACAO: "water",
  MEDITACAO: "meditation",
  PERSONALIZADO: "custom",
};

/** Relações carregadas junto com cada meta. */
const incluir = {
  habito: true,
  lembretes: { orderBy: { horario: "asc" as const } },
  registros: { orderBy: { data: "asc" as const } },
};
type MetaCompleta = Prisma.MetaGetPayload<{ include: typeof incluir }>;

// ---------------------------------------------------------------------------
// Funções auxiliares (privadas do módulo)
// ---------------------------------------------------------------------------

async function buscarMetasAtivas(usuarioId: number) {
  return prisma.meta.findMany({
    where: { usuarioId, ativa: true },
    include: incluir,
    orderBy: { id: "asc" },
    take: 100,
  });
}

/** Busca um hábito do usuário ou responde 404. */
async function buscarMeta(usuarioId: number, id: number) {
  const meta = await prisma.meta.findFirst({ where: { id, usuarioId, ativa: true }, include: incluir });
  if (!meta) throw new AppError("Hábito não encontrado.", 404);
  return meta;
}

/** Converte a meta do banco no formato que a tela usa. */
function apresentar(meta: MetaCompleta, dia: Date) {
  let frequencia: "DIARIA" | "DIAS_ESPECIFICOS" | "SEMANAL" = "DIARIA";
  if (meta.periodo === "SEMANAL") frequencia = "SEMANAL";
  else if (meta.diasSemana.length) frequencia = "DIAS_ESPECIFICOS";

  return {
    id: meta.id,
    nome: meta.nome ?? meta.habito.nome,
    icone: meta.icone ?? ICONE_DA_CATEGORIA[meta.habito.categoria] ?? "custom",
    ...situacao(meta, dia),
    unidade: meta.unidade,
    frequencia,
    diasSemana: meta.diasSemana,
    quantidadeSemanal: meta.quantidadeSemanal,
    permitirPausa: meta.permitirPausa,
    lembretesAtivos: meta.lembretesAtivos,
    horarios: meta.lembretes.map((lembrete) => lembrete.horario.toISOString().slice(11, 16)),
    dataInicio: chaveData(meta.dataInicio),
    metaConfigurada: meta.frequenciaAlvo,
  };
}

/** Campos da tabela Meta a partir do formulário. */
function configuracaoDaMeta(dados: HabitoInput) {
  return {
    nome: dados.nome,
    icone: dados.icone,
    frequenciaAlvo: dados.meta,
    unidade: dados.unidade,
    periodo: dados.frequencia === "SEMANAL" ? ("SEMANAL" as const) : ("DIARIA" as const),
    diasSemana: dados.frequencia === "DIAS_ESPECIFICOS" ? dados.diasSemana : [],
    quantidadeSemanal: dados.frequencia === "SEMANAL" ? dados.quantidadeSemanal : null,
    permitirPausa: dados.permitirPausa,
    lembretesAtivos: dados.lembretesAtivos,
  };
}

/** Garante que exista a categoria (Habito) correspondente ao ícone. */
async function categoriaDoIcone(tx: Transacao, icone: HabitoInput["icone"]) {
  const nome = `Categoria ${icone}`;
  const categoria = CATEGORIA_DO_ICONE[icone];
  return tx.habito.upsert({
    where: { nome_categoria: { nome, categoria } },
    update: {},
    create: { nome, categoria },
  });
}

/** UC09 - Substitui os horários de lembrete do hábito. */
async function salvarLembretes(tx: Transacao, usuarioId: number, metaId: number, dados: HabitoInput) {
  await tx.lembrete.deleteMany({ where: { metaId, usuarioId } });
  if (dados.horarios.length === 0) return;

  await tx.lembrete.createMany({
    data: dados.horarios.map((horario) => ({
      usuarioId,
      metaId,
      tipo: "META" as const,
      horario: new Date(`1970-01-01T${horario}:00Z`),
      diasSemana: dados.frequencia === "DIAS_ESPECIFICOS" ? dados.diasSemana : [],
      ativo: dados.lembretesAtivos,
    })),
  });
}

/** Horário atual (HH:mm) em São Paulo. */
function horarioAtual() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Operações usadas pelo controller
// ---------------------------------------------------------------------------

/** Hábitos do dia, resumo da semana e próximo lembrete. */
export async function listar(usuarioId: number, data?: string) {
  const hoje = dataLocal();
  const dia = data ? dataDeTexto(data) : hoje;
  const ehHoje = chaveData(dia) === chaveData(hoje);

  const metas = await buscarMetasAtivas(usuarioId);
  const habitos = metas.filter((meta) => agendado(meta, dia)).map((meta) => apresentar(meta, dia));

  // Próximo lembrete de hoje: hábitos não concluídos com horário ainda por vir.
  const agora = horarioAtual();
  const proximos = habitos
    .filter((habito) => habito.lembretesAtivos && !habito.pausado && !habito.concluido)
    .flatMap((habito) => habito.horarios.map((horario) => ({ id: habito.id, nome: habito.nome, horario })))
    .filter((lembrete) => lembrete.horario > agora)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  return {
    hoje: chaveData(hoje),
    data: chaveData(dia),
    habitos,
    totalCadastrados: metas.length,
    resumo: resumirPeriodo(metas, dia, hoje),
    proximoLembrete: ehHoje ? (proximos[0] ?? null) : null,
  };
}

/** Detalhe de um hábito: últimos 7 dias, média e histórico completo. */
export async function detalhe(usuarioId: number, id: number, data?: string) {
  const meta = await buscarMeta(usuarioId, id);
  const dia = data ? dataDeTexto(data) : dataLocal();

  const historico = diasDoPeriodo(dia).map((d) => ({
    data: chaveData(d),
    ...situacao(meta, d),
    agendado: agendado(meta, d),
  }));

  // Média apenas dos dias que têm registro e não foram pausados.
  const registrados = historico.filter(
    (item) => !item.pausado && meta.registros.some((registro) => chaveData(registro.data) === item.data),
  );
  const media = registrados.length
    ? Math.round((registrados.reduce((soma, item) => soma + item.valor, 0) / registrados.length) * 10) / 10
    : null;

  return {
    ...apresentar(meta, dia),
    historico,
    media,
    historicoCompleto: meta.registros.slice(-365).map((registro) => ({
      data: chaveData(registro.data),
      valor: registro.valor,
      meta: registro.metaAlvo ?? meta.frequenciaAlvo,
      pausado: registro.pausado,
      concluido: registro.concluido,
      avaliacaoSono: registro.avaliacaoSono,
    })),
  };
}

/** UC05 - Cria um hábito. */
export async function criar(usuarioId: number, dados: HabitoInput) {
  const meta = await prisma.$transaction(
    async (tx) => {
      const ativos = await tx.meta.count({ where: { usuarioId, ativa: true } });
      if (ativos >= MAXIMO_HABITOS) {
        throw new AppError(`Você já tem ${MAXIMO_HABITOS} hábitos. Edite um hábito existente.`);
      }

      const categoria = await categoriaDoIcone(tx, dados.icone);
      const nova = await tx.meta.create({
        data: { usuarioId, habitoId: categoria.id, dataInicio: dataLocal(), ...configuracaoDaMeta(dados) },
      });
      await salvarLembretes(tx, usuarioId, nova.id, dados);
      return nova;
    },
    // Serializable: impede que duas requisições simultâneas passem do limite de hábitos.
    { isolationLevel: "Serializable" },
  );
  return detalhe(usuarioId, meta.id);
}

/** UC05 - Edita um hábito. A nova meta vale a partir de hoje; dias anteriores não mudam. */
export async function editar(usuarioId: number, id: number, dados: HabitoInput) {
  await buscarMeta(usuarioId, id);
  const hoje = dataLocal();

  await prisma.$transaction(async (tx) => {
    const categoria = await categoriaDoIcone(tx, dados.icone);
    await tx.meta.update({
      where: { id, usuarioId },
      data: { habitoId: categoria.id, ...configuracaoDaMeta(dados) },
    });
    await salvarLembretes(tx, usuarioId, id, dados);

    // Recalcula o registro de hoje com o novo alvo.
    const registroHoje = await tx.registroHabito.findUnique({ where: { metaId_data: { metaId: id, data: hoje } } });
    if (registroHoje) {
      await tx.registroHabito.update({
        where: { id: registroHoje.id },
        data: { metaAlvo: dados.meta, concluido: !registroHoje.pausado && registroHoje.valor >= dados.meta },
      });
    }
  });
  return detalhe(usuarioId, id);
}

/** Exclusão lógica: o hábito some da tela, mas o histórico continua no banco. */
export async function excluir(usuarioId: number, id: number) {
  await buscarMeta(usuarioId, id);
  await prisma.$transaction(async (tx) => {
    await tx.meta.update({ where: { id, usuarioId }, data: { ativa: false, lembretesAtivos: false } });
    await tx.lembrete.updateMany({ where: { metaId: id, usuarioId }, data: { ativo: false } });
  });
  return { mensagem: "Hábito excluído." };
}

/**
 * UC06 - Registra o progresso de um dia.
 * UC10 - Concluir um hábito HOJE vale pontos. Se o colaborador desfizer a
 *        conclusão no mesmo dia, os pontos são retirados (sem "farm" de pontos).
 */
export async function registrar(usuarioId: number, id: number, dados: RegistroInput) {
  const meta = await buscarMeta(usuarioId, id);
  const dia = dataDeTexto(dados.data);
  const hoje = dataLocal();

  // Validações de negócio
  if (dia > hoje) throw new AppError("O progresso poderá ser registrado quando esse dia chegar.");
  if (!agendado(meta, dia)) throw new AppError("Este hábito não está programado para a data selecionada.");
  if (dados.pausado && !meta.permitirPausa) throw new AppError("Ative a opção de pausa nas configurações do hábito.");

  const atual = situacao(meta, dia);
  if (dados.valor > Math.max(atual.meta, atual.valor)) throw new AppError("O progresso não pode ultrapassar a meta.");

  const ehSono = meta.icone === "sleep" || meta.habito.categoria === "SONO";
  if (dados.avaliacaoSono != null && !ehSono) throw new AppError("A avaliação de sono não se aplica a este hábito.");

  const novo = {
    valor: dados.valor,
    metaAlvo: atual.meta,
    pausado: dados.pausado,
    concluido: !dados.pausado && dados.valor >= atual.meta,
    avaliacaoSono: dados.avaliacaoSono ?? atual.avaliacaoSono,
  };

  await prisma.$transaction(
    async (tx) => {
      await tx.registroHabito.upsert({
        where: { metaId_data: { metaId: id, data: dia } },
        create: { metaId: id, data: dia, ...novo },
        update: novo,
      });

      // Liga/desliga os lembretes direto pela tela de registro.
      if (dados.lembretesAtivos !== undefined) {
        if (dados.lembretesAtivos && !meta.lembretes.length) {
          throw new AppError("Configure pelo menos um horário antes de ativar o lembrete.");
        }
        await tx.meta.update({ where: { id, usuarioId }, data: { lembretesAtivos: dados.lembretesAtivos } });
        await tx.lembrete.updateMany({ where: { metaId: id, usuarioId }, data: { ativo: dados.lembretesAtivos } });
      }

      // Hábito semanal: não deixa passar da quantidade de dias por semana.
      if (meta.periodo === "SEMANAL") {
        const inicio = adicionarDias(dia, -dia.getUTCDay());
        const feitos = await tx.registroHabito.count({
          where: {
            metaId: id,
            data: { gte: inicio, lte: adicionarDias(inicio, 6) },
            concluido: true,
            pausado: false,
          },
        });
        if (feitos > (meta.quantidadeSemanal ?? 7)) {
          throw new AppError("A meta semanal já foi realizada. Ajuste a frequência para adicionar outro dia.");
        }
      }

      // Pontos: só para o dia de hoje e só quando a situação "concluído" muda.
      if (chaveData(dia) === chaveData(hoje) && atual.concluido !== novo.concluido) {
        await adicionarPontos(tx, usuarioId, novo.concluido ? PONTOS.HABITO_CONCLUIDO : -PONTOS.HABITO_CONCLUIDO);
      }
    },
    { isolationLevel: "Serializable" },
  );

  return detalhe(usuarioId, id, dados.data);
}

/**
 * Importa hábitos que a versão antiga guardava só no navegador.
 * É idempotente: importar duas vezes não duplica nada (usa `origemLocalId`).
 */
export async function importar(usuarioId: number, dados: ImportacaoInput) {
  const hoje = chaveData(dataLocal());
  if (dados.registros.some((registro) => registro.data > hoje)) {
    throw new AppError("A importação não aceita registros futuros.");
  }

  const idsLocais = new Set(dados.registros.flatMap((registro) => registro.habitos.map((habito) => habito.id)));
  if (idsLocais.size > MAXIMO_HABITOS) throw new AppError(`A importação permite até ${MAXIMO_HABITOS} hábitos.`);

  const unidadeDoIcone = (icone: string) =>
    icone === "water" ? "copos" : icone === "coffee" ? "pausas" : icone === "sleep" ? "registro" : "min";

  await prisma.$transaction(async (tx) => {
    const existentes = await tx.meta.findMany({ where: { usuarioId }, select: { origemLocalId: true } });
    const novos = [...idsLocais].filter((idLocal) => !existentes.some((meta) => meta.origemLocalId === idLocal));
    if (existentes.length + novos.length > MAXIMO_HABITOS) {
      throw new AppError(`A importação ultrapassaria o limite de ${MAXIMO_HABITOS} hábitos.`);
    }

    const ordenados = [...dados.registros].sort((a, b) => a.data.localeCompare(b.data));
    for (const registro of ordenados) {
      const data = dataDeTexto(registro.data);

      for (const legado of registro.habitos) {
        const categoria = await categoriaDoIcone(tx, legado.icone);
        const meta = await tx.meta.upsert({
          where: { usuarioId_origemLocalId: { usuarioId, origemLocalId: legado.id } },
          update: {},
          create: {
            usuarioId,
            habitoId: categoria.id,
            origemLocalId: legado.id,
            nome: legado.nome,
            icone: legado.icone,
            unidade: unidadeDoIcone(legado.icone),
            frequenciaAlvo: legado.meta,
            periodo: "DIARIA",
            dataInicio: data,
          },
        });
        await tx.registroHabito.upsert({
          where: { metaId_data: { metaId: meta.id, data } },
          update: {},
          create: {
            metaId: meta.id,
            data,
            valor: legado.valor,
            metaAlvo: legado.meta,
            concluido: legado.valor >= legado.meta,
          },
        });
      }
    }
  });
  return { mensagem: "Registros anteriores preservados no banco." };
}
