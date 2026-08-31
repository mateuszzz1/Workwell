import { prisma } from "../src/database/prisma.js";
import {
  CategoriaHabito,
  PerfilUsuario,
} from "../src/generated/prisma/enums.js";
import { adicionarDias, dataLocal } from "../src/utils/data.js";

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: "00.000.000/0000-00" },
    update: { ativa: true },
    create: {
      nome: "Empresa Demonstração WorkWell",
      cnpj: "00.000.000/0000-00",
      porte: "Médio",
    },
  });

  const habitos = [
    {
      nome: "Sono regular",
      descricao: "Manter uma rotina consistente de sono.",
      categoria: CategoriaHabito.SONO,
    },
    {
      nome: "Atividade física",
      descricao: "Realizar uma atividade física adequada à rotina.",
      categoria: CategoriaHabito.ATIVIDADE_FISICA,
    },
    {
      nome: "Alimentação equilibrada",
      descricao: "Registrar uma escolha alimentar equilibrada.",
      categoria: CategoriaHabito.ALIMENTACAO,
    },
    {
      nome: "Pausa para alongamento",
      descricao: "Fazer uma pausa curta durante o expediente.",
      categoria: CategoriaHabito.PAUSA,
    },
    {
      nome: "Respiração consciente",
      descricao: "Reservar alguns minutos para reduzir o estresse.",
      categoria: CategoriaHabito.ESTRESSE,
    },
  ];

  for (const habito of habitos) {
    await prisma.habito.upsert({
      where: {
        nome_categoria: {
          nome: habito.nome,
          categoria: habito.categoria,
        },
      },
      update: { descricao: habito.descricao, ativo: true },
      create: habito,
    });
  }

  await prisma.medalha.upsert({
    where: { nome: "Primeiro passo" },
    update: {},
    create: {
      nome: "Primeiro passo",
      descricao: "Concedida após o primeiro check-in.",
      criterio: "Realizar 1 check-in diário.",
      icone: "primeiro-passo",
    },
  });

  await prisma.medalha.upsert({
    where: { nome: "Consistência" },
    update: {},
    create: {
      nome: "Consistência",
      descricao: "Concedida por uma sequência de check-ins.",
      criterio: "Realizar check-in por 7 dias consecutivos.",
      icone: "consistencia",
    },
  });

  const colaboradoresDemo = [
    { nome: "Ana Souza", email: "ana.souza@workwell.local", setor: "Tecnologia" },
    { nome: "Bruno Lima", email: "bruno.lima@workwell.local", setor: "Tecnologia" },
    { nome: "Camila Rocha", email: "camila.rocha@workwell.local", setor: "Financeiro" },
    { nome: "Diego Martins", email: "diego.martins@workwell.local", setor: "Operações" },
    { nome: "Elisa Oliveira", email: "elisa.oliveira@workwell.local", setor: "Comercial" },
    { nome: "Fábio Santos", email: "fabio.santos@workwell.local", setor: "Pessoas" },
  ];

  const colaboradores: Array<{ id: number }> = [];
  for (const colaborador of colaboradoresDemo) {
    const usuario = await prisma.usuario.upsert({
      where: { email: colaborador.email },
      update: {
        empresaId: empresa.id,
        nome: colaborador.nome,
        setor: colaborador.setor,
        ativo: true,
        onboardingConcluido: true,
      },
      create: {
        empresaId: empresa.id,
        nome: colaborador.nome,
        email: colaborador.email,
        perfil: PerfilUsuario.COLABORADOR,
        cargo: "Analista",
        setor: colaborador.setor,
        onboardingConcluido: true,
        pontosTotal: 60,
      },
    });
    colaboradores.push(usuario);
  }

  await prisma.usuario.upsert({
    where: { email: "rh.demo@workwell.local" },
    update: {
      empresaId: empresa.id,
      nome: "Mariana Costa",
      ativo: true,
      onboardingConcluido: true,
    },
    create: {
      empresaId: empresa.id,
      nome: "Mariana Costa",
      email: "rh.demo@workwell.local",
      perfil: PerfilUsuario.GESTOR_RH,
      cargo: "Gestora de RH",
      areaResponsavel: "Pessoas e Cultura",
      onboardingConcluido: true,
    },
  });

  const hoje = dataLocal();
  for (const [indiceUsuario, colaborador] of colaboradores.entries()) {
    for (let deslocamento = -6; deslocamento <= 0; deslocamento += 1) {
      // Ana fica sem o registro de hoje para demonstrar a criação no vídeo.
      if (indiceUsuario === 0 && deslocamento === 0) continue;

      const variacao = (indiceUsuario + Math.abs(deslocamento)) % 3;
      const data = adicionarDias(hoje, deslocamento);
      await prisma.checkin.upsert({
        where: {
          usuarioId_data: { usuarioId: colaborador.id, data },
        },
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

  console.log(
    `Carga fictícia concluída. Empresa ${empresa.id}; ${colaboradores.length} colaboradores com histórico.`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
