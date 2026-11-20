/**
 * Carga de dados FICTÍCIOS para desenvolvimento e demonstração.
 *
 * Rode com `npm run prisma:seed` (ou `db:setup`). Usa `upsert` em tudo, então
 * pode ser executado várias vezes sem duplicar registros.
 *
 * Todos os usuários de demonstração têm a senha SENHA_DEMO.
 */
import { prisma } from "../src/database/prisma.js";
import { CategoriaHabito, PerfilUsuario } from "../src/generated/prisma/enums.js";
import { MEDALHAS } from "../src/modules/gamificacao/gamificacao.regras.js";
import { adicionarDias, dataLocal } from "../src/utils/data.js";
import { gerarHashSenha } from "../src/utils/senha.js";

export const SENHA_DEMO = "12345678";

/** Colaboradores fictícios. Tecnologia tem 6 pessoas para demonstrar o filtro por setor. */
const COLABORADORES = [
  { nome: "Ana Souza", email: "user@ifsp.com", setor: "Tecnologia" },
  { nome: "Bruno Lima", email: "bruno.lima@workwell.local", setor: "Tecnologia" },
  { nome: "Carla Mendes", email: "carla.mendes@workwell.local", setor: "Tecnologia" },
  { nome: "Daniel Alves", email: "daniel.alves@workwell.local", setor: "Tecnologia" },
  { nome: "Eduarda Reis", email: "eduarda.reis@workwell.local", setor: "Tecnologia" },
  { nome: "Felipe Nunes", email: "felipe.nunes@workwell.local", setor: "Tecnologia" },
  { nome: "Camila Rocha", email: "camila.rocha@workwell.local", setor: "Financeiro" },
  { nome: "Diego Martins", email: "diego.martins@workwell.local", setor: "Operações" },
  { nome: "Elisa Oliveira", email: "elisa.oliveira@workwell.local", setor: "Comercial" },
  { nome: "Fábio Santos", email: "fabio.santos@workwell.local", setor: "Pessoas" },
];

const CATALOGO_HABITOS = [
  { nome: "Sono regular", descricao: "Manter uma rotina consistente de sono.", categoria: CategoriaHabito.SONO },
  { nome: "Atividade física", descricao: "Realizar uma atividade física adequada à rotina.", categoria: CategoriaHabito.ATIVIDADE_FISICA },
  { nome: "Alimentação equilibrada", descricao: "Registrar uma escolha alimentar equilibrada.", categoria: CategoriaHabito.ALIMENTACAO },
  { nome: "Pausa para alongamento", descricao: "Fazer uma pausa curta durante o expediente.", categoria: CategoriaHabito.PAUSA },
  { nome: "Respiração consciente", descricao: "Reservar alguns minutos para reduzir o estresse.", categoria: CategoriaHabito.ESTRESSE },
];

/**
 * As contas principais da demonstração mudaram de e-mail. Se o banco ainda
 * tiver o e-mail antigo, renomeamos a conta (mantendo o histórico) em vez de
 * criar uma conta duplicada.
 */
const EMAILS_RENOMEADOS = [
  { antigo: "ana.souza@workwell.local", novo: "user@ifsp.com" },
  { antigo: "rh.demo@workwell.local", novo: "rh@ifsp.com" },
];

async function renomearContasAntigas() {
  for (const { antigo, novo } of EMAILS_RENOMEADOS) {
    const [contaAntiga, contaNova] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: antigo } }),
      prisma.usuario.findUnique({ where: { email: novo } }),
    ]);
    if (contaAntiga && !contaNova) {
      await prisma.usuario.update({ where: { id: contaAntiga.id }, data: { email: novo } });
    }
  }
}

async function main() {
  const senhaHash = await gerarHashSenha(SENHA_DEMO);
  await renomearContasAntigas();

  // Empresa ---------------------------------------------------------------
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: "00.000.000/0000-00" },
    update: { ativa: true },
    create: { nome: "Empresa Demonstração WorkWell", cnpj: "00.000.000/0000-00", porte: "Médio" },
  });

  // Catálogo de hábitos e medalhas -----------------------------------------
  for (const habito of CATALOGO_HABITOS) {
    await prisma.habito.upsert({
      where: { nome_categoria: { nome: habito.nome, categoria: habito.categoria } },
      update: { descricao: habito.descricao, ativo: true },
      create: habito,
    });
  }
  for (const medalha of Object.values(MEDALHAS)) {
    await prisma.medalha.upsert({ where: { nome: medalha.nome }, update: {}, create: medalha });
  }

  // Colaboradores ----------------------------------------------------------
  const colaboradores: Array<{ id: number }> = [];
  for (const colaborador of COLABORADORES) {
    const usuario = await prisma.usuario.upsert({
      where: { email: colaborador.email },
      update: { empresaId: empresa.id, nome: colaborador.nome, setor: colaborador.setor, ativo: true, onboardingConcluido: true, senhaHash },
      create: {
        empresaId: empresa.id,
        nome: colaborador.nome,
        email: colaborador.email,
        senhaHash,
        perfil: PerfilUsuario.COLABORADOR,
        cargo: "Analista",
        setor: colaborador.setor,
        onboardingConcluido: true,
        pontosTotal: 60,
      },
    });
    colaboradores.push(usuario);
  }

  // Gestora de RH ----------------------------------------------------------
  const gestora = await prisma.usuario.upsert({
    where: { email: "rh@ifsp.com" },
    update: { empresaId: empresa.id, nome: "Mariana Costa", ativo: true, onboardingConcluido: true, senhaHash },
    create: {
      empresaId: empresa.id,
      nome: "Mariana Costa",
      email: "rh@ifsp.com",
      senhaHash,
      perfil: PerfilUsuario.GESTOR_RH,
      cargo: "Gestora de RH",
      areaResponsavel: "Pessoas e Cultura",
      onboardingConcluido: true,
    },
  });

  // Check-ins dos últimos 7 dias ------------------------------------------
  const hoje = dataLocal();
  for (const [indice, colaborador] of colaboradores.entries()) {
    for (let deslocamento = -6; deslocamento <= 0; deslocamento += 1) {
      // Ana (índice 0) fica sem o check-in de hoje para a demonstração.
      if (indice === 0 && deslocamento === 0) continue;

      const variacao = (indice + Math.abs(deslocamento)) % 3;
      const data = adicionarDias(hoje, deslocamento);
      await prisma.checkin.upsert({
        where: { usuarioId_data: { usuarioId: colaborador.id, data } },
        update: {},
        create: {
          usuarioId: colaborador.id,
          data,
          humor: 3 + (variacao % 2),
          energia: 3 + ((variacao + 1) % 2),
          sono: 3 + (variacao % 2),
          estresse: 2 + (variacao % 2),
        },
      });
    }
  }

  // Lembretes de exemplo da Ana (UC09) -------------------------------------
  const ana = colaboradores[0]!;
  const lembretesAna = [
    { tipo: "CHECKIN" as const, horario: "09:00", diasSemana: [1, 2, 3, 4, 5] },
    { tipo: "PAUSA" as const, horario: "15:00", diasSemana: [1, 2, 3, 4, 5] },
    { tipo: "DESCANSO" as const, horario: "22:00", diasSemana: [] },
  ];
  for (const lembrete of lembretesAna) {
    const horario = new Date(`1970-01-01T${lembrete.horario}:00Z`);
    const existe = await prisma.lembrete.findFirst({ where: { usuarioId: ana.id, metaId: null, tipo: lembrete.tipo, horario } });
    if (!existe) await prisma.lembrete.create({ data: { usuarioId: ana.id, tipo: lembrete.tipo, horario, diasSemana: lembrete.diasSemana } });
  }

  // Desafio de exemplo -----------------------------------------------------
  const tituloDesafio = "Semana da hidratação";
  const desafioExistente = await prisma.desafio.findFirst({ where: { empresaId: empresa.id, titulo: tituloDesafio } });
  if (!desafioExistente) {
    await prisma.desafio.create({
      data: {
        empresaId: empresa.id,
        criadoPorId: gestora.id,
        titulo: tituloDesafio,
        descricao: "Beba água ao longo do expediente e registre aqui uma vez por dia.",
        dataInicio: adicionarDias(hoje, -2),
        dataFim: adicionarDias(hoje, 12),
        metaRegistros: 5,
        pontosRecompensa: 50,
      },
    });
  }

  console.log(`Carga fictícia concluída: ${colaboradores.length} colaboradores e 1 gestora. Senha: ${SENHA_DEMO}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
