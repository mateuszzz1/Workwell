/**
 * Teste de sistema: percorre TODAS as rotas documentadas em docs/API.md e,
 * depois de cada ação, confere no banco se os dados foram gravados corretamente.
 *
 * Pré-requisito: banco com a carga fictícia (`npm run db:setup` ou `demo:reset`).
 * Rodar: npm run test:integracao
 *
 * Os dados criados aqui usam e-mails @teste.local e são apagados no final.
 */
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";
import { momentoAtual } from "../src/modules/lembretes/lembrete.regras.js";
import { adicionarDias, chaveData, dataLocal } from "../src/utils/data.js";

const SENHA_DEMO = "12345678";
const SUFIXO = Date.now();
let base = "";
let servidor: ReturnType<typeof app.listen>;

type Resposta = { status: number; corpo: any };

async function chamar(caminho: string, opcoes: { metodo?: string; corpo?: unknown; token?: string; bruto?: string } = {}): Promise<Resposta> {
  const resposta = await fetch(`${base}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: { "Content-Type": "application/json", ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}) },
    ...(opcoes.bruto !== undefined ? { body: opcoes.bruto } : opcoes.corpo !== undefined ? { body: JSON.stringify(opcoes.corpo) } : {}),
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

async function login(email: string, senha = SENHA_DEMO) {
  const r = await chamar("/auth/login", { metodo: "POST", corpo: { email, senha } });
  assert.equal(r.status, 200, `login de ${email} falhou: ${JSON.stringify(r.corpo)}`);
  return r.corpo.token as string;
}

const hoje = () => dataLocal();
const textoHoje = () => chaveData(dataLocal());

/** Cria um colaborador de teste já com onboarding concluído. */
async function novoColaborador(nome: string, setor = "Comercial") {
  const email = `${nome.toLowerCase()}.${SUFIXO}@teste.local`;
  const cadastro = await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome, email, senha: "senhaTeste1" } });
  assert.equal(cadastro.status, 201);
  const token = cadastro.corpo.token as string;
  const onb = await chamar("/usuarios/me/onboarding", {
    metodo: "POST",
    token,
    corpo: { nome, cargo: null, setor, prefNotificacao: true, habitosIniciais: [] },
  });
  assert.equal(onb.status, 200);
  return { token, id: cadastro.corpo.usuario.id as number, email };
}

before(async () => {
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
});

after(async () => {
  await prisma.desafio.deleteMany({ where: { titulo: { startsWith: `[teste ${SUFIXO}]` } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: "@teste.local" } } });
  servidor.close();
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
describe("infraestrutura", () => {
  test("health, raiz, 404 e JSON malformado", async () => {
    const health = await chamar("/health");
    assert.equal(health.status, 200);
    assert.equal(health.corpo.banco, "conectado");
    assert.equal((await chamar("/")).status, 200);
    assert.equal((await chamar("/rota-que-nao-existe")).status, 404);

    // Corpo que não é JSON válido deve ser 400 (erro do cliente), não 500.
    // (rota fora de /auth para não gastar o limite de tentativas falhas do login)
    const malformado = await chamar("/usuarios/me", { metodo: "PUT", bruto: "{ isso não é json" });
    assert.equal(malformado.status, 400);
  });
});

// ---------------------------------------------------------------------------
describe("UC01/UC02 cadastro e login + banco", () => {
  test("cadastro grava colaborador com senha em hash e onboarding pendente", async () => {
    const email = `Cadastro.${SUFIXO}@TESTE.local`; // maiúsculas: deve ser salvo em minúsculas
    const r = await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome: "  Pessoa Cadastro  ", email, senha: "senhaSegura1" } });
    assert.equal(r.status, 201);
    assert.ok(r.corpo.token);
    assert.equal(r.corpo.usuario.senhaHash, undefined);

    const noBanco = await prisma.usuario.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    assert.equal(noBanco.nome, "Pessoa Cadastro"); // espaços removidos
    assert.equal(noBanco.perfil, "COLABORADOR");
    assert.equal(noBanco.onboardingConcluido, false);
    assert.equal(noBanco.pontosTotal, 0);
    assert.ok(noBanco.senhaHash?.startsWith("scrypt:"));
    assert.ok(!noBanco.senhaHash?.includes("senhaSegura1"));
    const empresa = await prisma.empresa.findFirstOrThrow({ where: { ativa: true }, orderBy: { id: "asc" } });
    assert.equal(noBanco.empresaId, empresa.id);

    // Mesmo e-mail com outra capitalização é recusado.
    const repetido = await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome: "Outra", email: email.toUpperCase(), senha: "senhaSegura1" } });
    assert.equal(repetido.status, 409);

    // Login funciona com o e-mail em qualquer capitalização.
    assert.ok(await login(email.toUpperCase(), "senhaSegura1"));
  });

  test("validações do cadastro", async () => {
    for (const corpo of [
      { nome: "A", email: `x.${SUFIXO}@teste.local`, senha: "senhaSegura1" },
      { nome: "Válido", email: "nao-e-email", senha: "senhaSegura1" },
      { nome: "Válido", email: `y.${SUFIXO}@teste.local`, senha: "curta" },
      { nome: "Válido", email: `z.${SUFIXO}@teste.local` },
    ]) {
      const r = await chamar("/auth/cadastro", { metodo: "POST", corpo });
      assert.equal(r.status, 400, JSON.stringify(corpo));
      assert.ok(r.corpo.detalhes.length > 0);
    }
  });

  test("ninguém se cadastra como RH (campo perfil é ignorado)", async () => {
    const email = `quer.ser.rh.${SUFIXO}@teste.local`;
    const r = await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome: "Espertinho", email, senha: "senhaSegura1", perfil: "GESTOR_RH" } });
    assert.equal(r.status, 201);
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { email } })).perfil, "COLABORADOR");
  });

  test("login: mensagens genéricas e token adulterado", async () => {
    const errada = await chamar("/auth/login", { metodo: "POST", corpo: { email: "user@ifsp.com", senha: "errada123" } });
    const inexistente = await chamar("/auth/login", { metodo: "POST", corpo: { email: "ninguem@workwell.local", senha: "errada123" } });
    assert.equal(errada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.equal(errada.corpo.erro, inexistente.corpo.erro); // não revela se o e-mail existe

    const token = await login("user@ifsp.com");
    const [dados, assinatura] = token.split(".");
    const falsificado = Buffer.from(Buffer.from(dados!, "base64url").toString().replace("COLABORADOR", "GESTOR_RH")).toString("base64url");
    assert.equal((await chamar("/dashboard", { token: `${falsificado}.${assinatura}` })).status, 401);
    assert.equal((await chamar("/usuarios/me", { token: "abc" })).status, 401);
  });

  test("usuário desativado perde o acesso mesmo com token válido", async () => {
    const { token, id } = await novoColaborador("Desativado");
    assert.equal((await chamar("/usuarios/me", { token })).status, 200);
    await prisma.usuario.update({ where: { id }, data: { ativo: false } });
    assert.equal((await chamar("/usuarios/me", { token })).status, 401);
    const email = (await prisma.usuario.findUniqueOrThrow({ where: { id } })).email;
    assert.equal((await chamar("/auth/login", { metodo: "POST", corpo: { email, senha: "senhaTeste1" } })).status, 401);
  });
});

// ---------------------------------------------------------------------------
describe("UC03 onboarding e UC01 perfil + banco", () => {
  test("onboarding grava perfil, cria hábitos escolhidos e libera as rotas", async () => {
    const email = `onb.${SUFIXO}@teste.local`;
    const cad = await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome: "Onboarding Teste", email, senha: "senhaTeste1" } });
    const token = cad.corpo.token as string;

    // Antes do onboarding: rotas do colaborador bloqueadas.
    for (const rota of ["/checkins/resumo", "/habitos", "/lembretes", "/desafios/1/participar"]) {
      const r = await chamar(rota, { token, metodo: rota.includes("participar") ? "POST" : "GET" });
      assert.equal(r.status, 403, rota);
    }

    const opcoes = await chamar("/usuarios/onboarding/opcoes", { token });
    assert.equal(opcoes.status, 200);
    assert.ok(opcoes.corpo.setores.includes("Tecnologia"));
    assert.equal(opcoes.corpo.habitosSugeridos.length, 5);

    assert.equal(
      (await chamar("/usuarios/me/onboarding", { metodo: "POST", token, corpo: { nome: "X Y", cargo: null, setor: "Marte", prefNotificacao: true } })).status,
      400,
    );

    const ok = await chamar("/usuarios/me/onboarding", {
      metodo: "POST",
      token,
      corpo: { nome: "Onboarding Teste", cargo: "Designer", setor: "Pessoas", prefNotificacao: false, habitosIniciais: ["water", "exercise"] },
    });
    assert.equal(ok.status, 200);

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email }, include: { metas: { include: { habito: true } } } });
    assert.equal(usuario.onboardingConcluido, true);
    assert.equal(usuario.setor, "Pessoas");
    assert.equal(usuario.cargo, "Designer");
    assert.equal(usuario.prefNotificacao, false);
    assert.equal(usuario.metas.length, 2);
    const agua = usuario.metas.find((meta) => meta.icone === "water")!;
    assert.equal(agua.frequenciaAlvo, 8);
    assert.equal(agua.unidade, "copos");
    assert.equal(agua.habito.categoria, "HIDRATACAO");
    assert.equal(chaveData(agua.dataInicio), textoHoje());

    // Repetir o onboarding é recusado.
    assert.equal((await chamar("/usuarios/me/onboarding", { metodo: "POST", token, corpo: { nome: "Z Z", cargo: null, setor: "Pessoas", prefNotificacao: true } })).status, 409);
    assert.equal((await chamar("/checkins/resumo", { token })).status, 200);
  });

  test("editar perfil (UC01) grava no banco; RH não usa rotas de colaborador", async () => {
    const { token, id } = await novoColaborador("Perfil");
    const r = await chamar("/usuarios/me", { metodo: "PUT", token, corpo: { nome: "Perfil Editado", cargo: "Analista Sr", setor: "Financeiro", prefNotificacao: false } });
    assert.equal(r.status, 200);
    const noBanco = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    assert.deepEqual([noBanco.nome, noBanco.cargo, noBanco.setor, noBanco.prefNotificacao], ["Perfil Editado", "Analista Sr", "Financeiro", false]);

    const rh = await login("rh@ifsp.com");
    assert.equal((await chamar("/usuarios/me", { token: rh })).status, 200);
    assert.equal((await chamar("/usuarios/me/onboarding", { metodo: "POST", token: rh, corpo: {} })).status, 403);
    assert.equal((await chamar("/usuarios/me", { metodo: "PUT", token: rh, corpo: {} })).status, 403);
  });
});

// ---------------------------------------------------------------------------
describe("UC04/UC07 check-in + UC10 pontos e medalhas + banco", () => {
  test("primeiro check-in, edição, sequência de 7 dias e medalhas", async () => {
    const { token, id } = await novoColaborador("Checkin");

    // 6 dias anteriores inseridos direto no banco: o check-in de hoje fecha 7 seguidos.
    for (let d = 1; d <= 6; d++) {
      await prisma.checkin.create({ data: { usuarioId: id, data: adicionarDias(hoje(), -d), humor: 3, energia: 3 } });
    }

    // Tentativa de gravar para outra pessoa: o usuarioId do corpo é ignorado.
    const ana = await prisma.usuario.findUniqueOrThrow({ where: { email: "user@ifsp.com" } });
    const r = await chamar("/checkins", { metodo: "POST", token, corpo: { usuarioId: ana.id, humor: 5, energia: 4, sono: null, estresse: 2, observacao: "  dia bom  " } });
    assert.equal(r.status, 201);
    assert.equal(r.corpo.pontosGanhos, 10);
    assert.deepEqual(r.corpo.medalhasNovas.sort(), ["Consistência", "Primeiro passo"]);

    const registro = await prisma.checkin.findUniqueOrThrow({ where: { usuarioId_data: { usuarioId: id, data: hoje() } } });
    assert.deepEqual([registro.humor, registro.energia, registro.sono, registro.estresse, registro.observacao], [5, 4, null, 2, "dia bom"]);
    assert.equal(await prisma.checkin.count({ where: { usuarioId: ana.id, data: hoje(), humor: 5, observacao: "dia bom" } }), 0);

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id }, include: { medalhas: { include: { medalha: true } } } });
    assert.equal(usuario.pontosTotal, 10);
    assert.deepEqual(usuario.medalhas.map((m) => m.medalha.nome).sort(), ["Consistência", "Primeiro passo"]);

    // Edição no mesmo dia: atualiza, não duplica, não dá pontos.
    const edicao = await chamar("/checkins", { metodo: "POST", token, corpo: { humor: 2, energia: 2 } });
    assert.equal(edicao.status, 200);
    assert.equal(edicao.corpo.pontosGanhos, 0);
    assert.equal(await prisma.checkin.count({ where: { usuarioId: id, data: hoje() } }), 1);
    const editado = await prisma.checkin.findUniqueOrThrow({ where: { usuarioId_data: { usuarioId: id, data: hoje() } } });
    assert.deepEqual([editado.humor, editado.sono, editado.estresse, editado.observacao], [2, null, null, null]);
    const depoisDaEdicao = await prisma.usuario.findUniqueOrThrow({ where: { id }, include: { medalhas: true } });
    assert.equal(depoisDaEdicao.pontosTotal, 10);
    assert.equal(depoisDaEdicao.medalhas.length, 2);

    // Resumo semanal e mensal conferidos com o banco.
    const semana = await chamar("/checkins/resumo", { token });
    assert.equal(semana.corpo.sequencia, 7);
    assert.equal(semana.corpo.historico.length, 7);
    assert.equal(semana.corpo.checkinHoje.humor, 2);
    assert.equal(semana.corpo.medias.humor, Number(((3 * 6 + 2) / 7).toFixed(1)));
    assert.equal(semana.corpo.medias.sono, null);
    const mes = await chamar("/checkins/resumo?dias=30", { token });
    assert.equal(mes.corpo.dias, 30);
    assert.equal(mes.corpo.historico.length, 7);

    // Gamificação reflete o banco.
    const gam = await chamar("/gamificacao/me", { token });
    assert.equal(gam.corpo.pontos, 10);
    assert.deepEqual(gam.corpo.medalhas.filter((m: any) => m.conquistada).map((m: any) => m.nome).sort(), ["Consistência", "Primeiro passo"]);
    assert.equal(gam.corpo.medalhas.length, await prisma.medalha.count());
  });

  test("validações do check-in", async () => {
    const { token } = await novoColaborador("Validacao");
    for (const corpo of [{ humor: 6, energia: 3 }, { humor: 0, energia: 3 }, { energia: 3 }, { humor: 3, energia: 3, sono: 9 }, { humor: 3, energia: 3, observacao: "x".repeat(501) }, { humor: 2.5, energia: 3 }]) {
      assert.equal((await chamar("/checkins", { metodo: "POST", token, corpo })).status, 400, JSON.stringify(corpo));
    }
    assert.equal((await chamar("/checkins/resumo?dias=15", { token })).status, 400);
  });
});

// ---------------------------------------------------------------------------
describe("UC05/UC06/UC09 hábitos + banco", () => {
  const habito = {
    nome: "Água teste",
    icone: "water",
    meta: 3,
    unidade: "copos",
    frequencia: "DIARIA",
    diasSemana: [],
    quantidadeSemanal: null,
    permitirPausa: false,
    lembretesAtivos: true,
    horarios: ["09:00", "14:30"],
  };

  test("criar, registrar (pontos), desfazer, editar, excluir", async () => {
    const { token, id } = await novoColaborador("Habito");
    const criado = await chamar("/habitos", { metodo: "POST", token, corpo: habito });
    assert.equal(criado.status, 201);
    const metaId = criado.corpo.id as number;

    const meta = await prisma.meta.findUniqueOrThrow({ where: { id: metaId }, include: { lembretes: { orderBy: { horario: "asc" } } } });
    assert.equal(meta.usuarioId, id);
    assert.equal(meta.frequenciaAlvo, 3);
    assert.deepEqual(meta.lembretes.map((l) => l.horario.toISOString().slice(11, 16)), ["09:00", "14:30"]);
    assert.ok(meta.lembretes.every((l) => l.tipo === "META" && l.ativo));

    // Lista do dia
    const lista = await chamar(`/habitos?data=${textoHoje()}`, { token });
    assert.equal(lista.corpo.totalCadastrados, 1);
    assert.equal(lista.corpo.habitos[0].estado, "NAO_INICIADO");

    // Validações de registro
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 4, pausado: false } })).status, 400); // passa da meta
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: chaveData(adicionarDias(hoje(), 1)), valor: 1, pausado: false } })).status, 400); // futuro
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 0, pausado: true } })).status, 400); // pausa desativada
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 1, pausado: false, avaliacaoSono: 4 } })).status, 400); // sono em água

    // Progresso parcial: sem pontos
    await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 2, pausado: false } });
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id } })).pontosTotal, 0);

    // Concluiu: +2 pontos e registro concluído no banco
    const concluido = await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 3, pausado: false } });
    assert.equal(concluido.status, 200);
    assert.equal(concluido.corpo.estado, "CONCLUIDO");
    let reg = await prisma.registroHabito.findUniqueOrThrow({ where: { metaId_data: { metaId, data: hoje() } } });
    assert.deepEqual([reg.valor, reg.concluido, reg.metaAlvo], [3, true, 3]);
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id } })).pontosTotal, 2);

    // Registrar de novo o mesmo valor não soma pontos
    await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 3, pausado: false } });
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id } })).pontosTotal, 2);

    // Desfazer a conclusão retira os pontos
    await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 1, pausado: false } });
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id } })).pontosTotal, 0);

    // Registrar um dia passado não dá pontos
    await prisma.meta.update({ where: { id: metaId }, data: { dataInicio: adicionarDias(hoje(), -3) } });
    const ontem = chaveData(adicionarDias(hoje(), -1));
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token, corpo: { data: ontem, valor: 3, pausado: false } })).status, 200);
    assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id } })).pontosTotal, 0);

    // Editar a meta: novo alvo vale para hoje; o passado mantém o alvo antigo
    const editado = await chamar(`/habitos/${metaId}`, { metodo: "PUT", token, corpo: { ...habito, meta: 1, horarios: ["10:00"] } });
    assert.equal(editado.status, 200);
    reg = await prisma.registroHabito.findUniqueOrThrow({ where: { metaId_data: { metaId, data: hoje() } } });
    assert.deepEqual([reg.metaAlvo, reg.concluido], [1, true]);
    const regOntem = await prisma.registroHabito.findUniqueOrThrow({ where: { metaId_data: { metaId, data: adicionarDias(hoje(), -1) } } });
    assert.equal(regOntem.metaAlvo, 3);
    assert.equal(await prisma.lembrete.count({ where: { metaId } }), 1);

    // Detalhe e histórico
    const detalhe = await chamar(`/habitos/${metaId}`, { token });
    assert.equal(detalhe.corpo.historico.length, 7);
    assert.ok(detalhe.corpo.historicoCompleto.length >= 2);

    // Outro colaborador não acessa
    const outro = await novoColaborador("Intruso");
    assert.equal((await chamar(`/habitos/${metaId}`, { token: outro.token })).status, 404);
    assert.equal((await chamar(`/habitos/${metaId}/registro`, { metodo: "PUT", token: outro.token, corpo: { data: textoHoje(), valor: 1, pausado: false } })).status, 404);

    // Excluir é lógico: histórico fica, lembretes desligam
    assert.equal((await chamar(`/habitos/${metaId}`, { metodo: "DELETE", token })).status, 200);
    const excluida = await prisma.meta.findUniqueOrThrow({ where: { id: metaId }, include: { lembretes: true, registros: true } });
    assert.equal(excluida.ativa, false);
    assert.ok(excluida.lembretes.every((l) => !l.ativo));
    assert.ok(excluida.registros.length >= 2);
    assert.equal((await chamar(`/habitos/${metaId}`, { token })).status, 404);
  });

  test("validações e frequências do hábito", async () => {
    const { token } = await novoColaborador("Frequencia");
    for (const alteracao of [{ unidade: "horas" }, { meta: 0 }, { frequencia: "DIAS_ESPECIFICOS", diasSemana: [] }, { frequencia: "SEMANAL", quantidadeSemanal: null }, { horarios: ["99:00"] }, { lembretesAtivos: true, horarios: [] }, { extra: 1 }]) {
      assert.equal((await chamar("/habitos", { metodo: "POST", token, corpo: { ...habito, ...alteracao } })).status, 400, JSON.stringify(alteracao));
    }
    // Hábito só em um dia da semana diferente de hoje não aparece hoje
    const outroDia = (hoje().getUTCDay() + 1) % 7;
    const r = await chamar("/habitos", { metodo: "POST", token, corpo: { ...habito, frequencia: "DIAS_ESPECIFICOS", diasSemana: [outroDia], lembretesAtivos: false, horarios: [] } });
    assert.equal(r.status, 201);
    assert.equal((await chamar("/habitos", { token })).corpo.habitos.length, 0);
    assert.equal((await chamar(`/habitos/${r.corpo.id}/registro`, { metodo: "PUT", token, corpo: { data: textoHoje(), valor: 1, pausado: false } })).status, 400);
  });

  test("importação de dados antigos é idempotente", async () => {
    const { token, id } = await novoColaborador("Importa");
    const corpo = { registros: [{ data: textoHoje(), habitos: [{ id: "local-1", nome: "Água", icone: "water", valor: 2, meta: 8, unidade: "copos", concluido: false }] }] };
    assert.equal((await chamar("/habitos/importacao", { metodo: "POST", token, corpo })).status, 200);
    assert.equal((await chamar("/habitos/importacao", { metodo: "POST", token, corpo })).status, 200);
    assert.equal(await prisma.meta.count({ where: { usuarioId: id } }), 1);
    assert.equal(await prisma.registroHabito.count({ where: { meta: { usuarioId: id } } }), 1);
  });
});

// ---------------------------------------------------------------------------
describe("UC09 lembretes de pausa/descanso/check-in + banco", () => {
  test("CRUD, pendentes, adiar, dispensar e regras", async () => {
    const { token, id } = await novoColaborador("Lembrete");
    const agora = momentoAtual().horario;

    assert.equal((await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "META", horario: agora, diasSemana: [], ativo: true } })).status, 400);
    assert.equal((await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "PAUSA", horario: "25:00", diasSemana: [], ativo: true } })).status, 400);
    assert.equal((await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "PAUSA", horario: agora, diasSemana: [1, 1], ativo: true } })).status, 400);

    const pausa = await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "PAUSA", horario: agora, diasSemana: [], ativo: true } });
    const checkin = await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "CHECKIN", horario: agora, diasSemana: [], ativo: true } });
    const inativo = await chamar("/lembretes", { metodo: "POST", token, corpo: { tipo: "DESCANSO", horario: agora, diasSemana: [], ativo: false } });
    assert.equal(pausa.status, 201);
    const noBanco = await prisma.lembrete.findUniqueOrThrow({ where: { id: pausa.corpo.id } });
    assert.deepEqual([noBanco.usuarioId, noBanco.metaId, noBanco.tipo, noBanco.horario.toISOString().slice(11, 16)], [id, null, "PAUSA", agora]);

    // Pendentes agora: pausa e check-in (o inativo não)
    let pendentes = await chamar("/lembretes/pendentes", { token });
    // Se o minuto virou entre criar e consultar, o teste não é conclusivo: pula a checagem.
    if (momentoAtual().horario === agora) {
      assert.deepEqual(pendentes.corpo.map((p: any) => p.tipo).sort(), ["CHECKIN", "PAUSA"]);
      assert.ok(pendentes.corpo.every((p: any) => p.mensagem));

      // Depois do check-in do dia, o lembrete de check-in some
      await chamar("/checkins", { metodo: "POST", token, corpo: { humor: 3, energia: 3 } });
      pendentes = await chamar("/lembretes/pendentes", { token });
      assert.deepEqual(pendentes.corpo.map((p: any) => p.tipo), ["PAUSA"]);
    }

    // Adiar: grava adiadoAte ~10 min à frente e some dos pendentes
    const antes = Date.now();
    assert.equal((await chamar(`/lembretes/${pausa.corpo.id}/adiar`, { metodo: "POST", token, corpo: { minutos: 10 } })).status, 200);
    const adiado = await prisma.lembrete.findUniqueOrThrow({ where: { id: pausa.corpo.id } });
    const diferenca = adiado.adiadoAte!.getTime() - antes;
    assert.ok(diferenca > 9.5 * 60_000 && diferenca < 10.5 * 60_000, `adiamento de ${diferenca} ms`);
    assert.ok(!(await chamar("/lembretes/pendentes", { token })).corpo.some((p: any) => p.id === pausa.corpo.id));

    // Simula o fim do adiamento: volta a aparecer; dispensar limpa
    await prisma.lembrete.update({ where: { id: pausa.corpo.id }, data: { adiadoAte: new Date(Date.now() - 1000) } });
    assert.ok((await chamar("/lembretes/pendentes", { token })).corpo.some((p: any) => p.id === pausa.corpo.id));
    assert.equal((await chamar(`/lembretes/${pausa.corpo.id}/dispensar`, { metodo: "POST", token })).status, 200);
    assert.equal((await prisma.lembrete.findUniqueOrThrow({ where: { id: pausa.corpo.id } })).adiadoAte, null);

    // Preferência de notificação desligada: nenhum aviso
    await prisma.usuario.update({ where: { id }, data: { prefNotificacao: false } });
    await prisma.lembrete.update({ where: { id: pausa.corpo.id }, data: { adiadoAte: new Date(Date.now() - 1000) } });
    assert.deepEqual((await chamar("/lembretes/pendentes", { token })).corpo, []);

    // Editar cancela adiamento
    const edit = await chamar(`/lembretes/${pausa.corpo.id}`, { metodo: "PUT", token, corpo: { tipo: "DESCANSO", horario: "22:00", diasSemana: [0, 6], ativo: true } });
    assert.equal(edit.status, 200);
    const editado = await prisma.lembrete.findUniqueOrThrow({ where: { id: pausa.corpo.id } });
    assert.deepEqual([editado.tipo, editado.adiadoAte, editado.diasSemana], ["DESCANSO", null, [0, 6]]);
    assert.equal((await chamar(`/lembretes/${pausa.corpo.id}/adiar`, { metodo: "POST", token, corpo: { minutos: 7 } })).status, 400);

    // Lista só com os do usuário; lembrete de hábito não aparece nem é editável aqui
    const habito = await chamar("/habitos", { metodo: "POST", token, corpo: { nome: "H", icone: "water", meta: 1, unidade: "copos", frequencia: "DIARIA", diasSemana: [], quantidadeSemanal: null, permitirPausa: true, lembretesAtivos: true, horarios: ["08:00"] } });
    const lembreteHabito = await prisma.lembrete.findFirstOrThrow({ where: { metaId: habito.corpo.id } });
    const lista = await chamar("/lembretes", { token });
    assert.equal(lista.corpo.length, 3);
    assert.equal((await chamar(`/lembretes/${lembreteHabito.id}`, { metodo: "DELETE", token })).status, 404);

    // Outro usuário e RH
    const outro = await novoColaborador("OutroLembrete");
    assert.equal((await chamar(`/lembretes/${checkin.corpo.id}`, { metodo: "PUT", token: outro.token, corpo: { tipo: "PAUSA", horario: "10:00", diasSemana: [], ativo: true } })).status, 404);
    const rh = await login("rh@ifsp.com");
    assert.equal((await chamar("/lembretes", { token: rh })).status, 403);

    // Excluir
    assert.equal((await chamar(`/lembretes/${inativo.corpo.id}`, { metodo: "DELETE", token })).status, 200);
    assert.equal(await prisma.lembrete.count({ where: { id: inativo.corpo.id } }), 0);
  });
});

// ---------------------------------------------------------------------------
describe("UC08/UC14 desafios + UC10 recompensa + banco", () => {
  test("ciclo completo do desafio", async () => {
    const rh = await login("rh@ifsp.com");
    const gestora = await prisma.usuario.findUniqueOrThrow({ where: { email: "rh@ifsp.com" } });
    const titulo = `[teste ${SUFIXO}] Caminhada`;
    const fim = chaveData(adicionarDias(hoje(), 7));

    // Validações
    for (const corpo of [
      { titulo, dataInicio: fim, dataFim: textoHoje(), metaRegistros: 2, pontosRecompensa: 30 },
      { titulo, dataInicio: "2020-01-01", dataFim: "2020-01-05", metaRegistros: 2, pontosRecompensa: 30 },
      { titulo: "ab", dataInicio: textoHoje(), dataFim: fim, metaRegistros: 2, pontosRecompensa: 30 },
      { titulo, dataInicio: textoHoje(), dataFim: fim, metaRegistros: 0, pontosRecompensa: 30 },
      { titulo, dataInicio: textoHoje(), dataFim: fim, metaRegistros: 2, pontosRecompensa: -1 },
    ]) {
      assert.equal((await chamar("/desafios", { metodo: "POST", token: rh, corpo })).status, 400, JSON.stringify(corpo));
    }

    const criado = await chamar("/desafios", { metodo: "POST", token: rh, corpo: { titulo, descricao: "Caminhe 20 min", dataInicio: textoHoje(), dataFim: fim, metaRegistros: 2, pontosRecompensa: 30 } });
    assert.equal(criado.status, 201);
    const id = criado.corpo.id as number;
    const desafio = await prisma.desafio.findUniqueOrThrow({ where: { id } });
    assert.deepEqual([desafio.criadoPorId, desafio.empresaId, desafio.status, desafio.metaRegistros, desafio.pontosRecompensa], [gestora.id, gestora.empresaId, "ATIVO", 2, 30]);

    const { token, id: usuarioId } = await novoColaborador("Desafiante");
    const listaColab = await chamar("/desafios", { token });
    const visto = listaColab.corpo.find((d: any) => d.id === id);
    assert.equal(visto.participacao, null);
    assert.equal(visto.aberto, true);

    // Progresso antes de participar
    assert.equal((await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token })).status, 409);
    assert.equal((await chamar(`/desafios/${id}/participar`, { metodo: "POST", token })).status, 201);
    assert.equal((await chamar(`/desafios/${id}/participar`, { metodo: "POST", token })).status, 409);
    let part = await prisma.participacaoDesafio.findUniqueOrThrow({ where: { usuarioId_desafioId: { usuarioId, desafioId: id } } });
    assert.deepEqual([part.progresso, part.concluido, part.ultimoRegistro], [0, false, null]);

    // 1º registro
    const r1 = await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token });
    assert.equal(r1.status, 200);
    assert.equal(r1.corpo.concluido, false);
    part = await prisma.participacaoDesafio.findUniqueOrThrow({ where: { usuarioId_desafioId: { usuarioId, desafioId: id } } });
    assert.equal(part.progresso, 1);
    assert.equal(chaveData(part.ultimoRegistro!), textoHoje());
    assert.equal((await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token })).status, 409); // mesmo dia

    // Simula que o 1º registro foi ontem e conclui hoje
    await prisma.participacaoDesafio.update({ where: { usuarioId_desafioId: { usuarioId, desafioId: id } }, data: { ultimoRegistro: adicionarDias(hoje(), -1) } });
    const r2 = await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token });
    assert.equal(r2.corpo.concluido, true);
    assert.equal(r2.corpo.pontosGanhos, 30);
    assert.deepEqual(r2.corpo.medalhasNovas, ["Desafiante"]);
    part = await prisma.participacaoDesafio.findUniqueOrThrow({ where: { usuarioId_desafioId: { usuarioId, desafioId: id } } });
    assert.deepEqual([part.progresso, part.concluido], [2, true]);
    assert.ok(part.dataConclusao);
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId }, include: { medalhas: { include: { medalha: true } } } });
    assert.equal(usuario.pontosTotal, 30);
    assert.ok(usuario.medalhas.some((m) => m.medalha.nome === "Desafiante"));

    // Já concluído
    await prisma.participacaoDesafio.update({ where: { usuarioId_desafioId: { usuarioId, desafioId: id } }, data: { ultimoRegistro: adicionarDias(hoje(), -1) } });
    assert.equal((await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token })).status, 409);

    // Visão do RH: só contagens
    const listaRh = await chamar("/desafios", { token: rh });
    const doRh = listaRh.corpo.find((d: any) => d.id === id);
    assert.deepEqual([doRh.participantes, doRh.concluidos], [1, 1]);
    assert.ok(!JSON.stringify(listaRh.corpo).includes("Desafiante"));
    assert.ok(!JSON.stringify(listaRh.corpo).includes("usuarioId"));

    // Permissões cruzadas
    assert.equal((await chamar(`/desafios/${id}/encerrar`, { metodo: "PATCH", token })).status, 403);
    assert.equal((await chamar(`/desafios/${id}/participar`, { metodo: "POST", token: rh })).status, 403);
    assert.equal((await chamar("/desafios/999999/participar", { metodo: "POST", token })).status, 404);

    // Encerrar
    assert.equal((await chamar(`/desafios/${id}/encerrar`, { metodo: "PATCH", token: rh })).status, 200);
    assert.equal((await prisma.desafio.findUniqueOrThrow({ where: { id } })).status, "ENCERRADO");
    const outro = await novoColaborador("Atrasado");
    assert.equal((await chamar(`/desafios/${id}/participar`, { metodo: "POST", token: outro.token })).status, 400);
    assert.ok(!(await chamar("/desafios", { token: outro.token })).corpo.some((d: any) => d.id === id));
  });

  test("desafio que ainda não começou: participa, mas não registra", async () => {
    const rh = await login("rh@ifsp.com");
    const criado = await chamar("/desafios", {
      metodo: "POST",
      token: rh,
      corpo: { titulo: `[teste ${SUFIXO}] Futuro`, dataInicio: chaveData(adicionarDias(hoje(), 2)), dataFim: chaveData(adicionarDias(hoje(), 9)), metaRegistros: 3, pontosRecompensa: 10 },
    });
    const { token } = await novoColaborador("Antecipado");
    assert.equal(criado.corpo.aberto, false);
    assert.equal((await chamar(`/desafios/${criado.corpo.id}/participar`, { metodo: "POST", token })).status, 201);
    assert.equal((await chamar(`/desafios/${criado.corpo.id}/progresso`, { metodo: "POST", token })).status, 409);
  });
});

// ---------------------------------------------------------------------------
describe("UC11 painel do RH: números conferidos com o banco", () => {
  test("indicadores dos últimos 7 dias batem com um cálculo independente", async () => {
    const rh = await login("rh@ifsp.com");
    const gestora = await prisma.usuario.findUniqueOrThrow({ where: { email: "rh@ifsp.com" } });
    const r = await chamar("/dashboard", { token: rh });
    assert.equal(r.status, 200);

    const inicio = adicionarDias(hoje(), -6);
    const grupo = { empresaId: gestora.empresaId, perfil: "COLABORADOR" as const, ativo: true, onboardingConcluido: true };
    const colaboradores = await prisma.usuario.count({ where: grupo });
    const checkins = await prisma.checkin.findMany({ where: { data: { gte: inicio, lte: hoje() }, usuario: grupo } });
    const media = (v: number[]) => (v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)) : null);

    assert.equal(r.corpo.periodo.dias, 7);
    assert.equal(r.corpo.periodo.inicio, chaveData(inicio));
    assert.equal(r.corpo.indicadores.colaboradores, colaboradores);
    assert.equal(r.corpo.indicadores.participantes, new Set(checkins.map((c) => c.usuarioId)).size);
    assert.equal(r.corpo.indicadores.taxaEngajamento, Number(((checkins.length / (colaboradores * 7)) * 100).toFixed(1)));
    assert.equal(r.corpo.indicadores.humorMedio, media(checkins.map((c) => c.humor)));
    assert.equal(r.corpo.indicadores.estresseMedio, media(checkins.flatMap((c) => (c.estresse === null ? [] : [c.estresse]))));
    assert.equal(r.corpo.tendencia.length, 7);
    assert.equal(
      r.corpo.tendencia.reduce((s: number, d: any) => s + d.participantes, 0),
      checkins.length,
    );

    // Adesão a desafios conferida com o banco
    const filtroDesafio = { empresaId: gestora.empresaId, status: "ATIVO" as const, dataInicio: { lte: hoje() }, dataFim: { gte: inicio } };
    const participacoes = await prisma.participacaoDesafio.findMany({ where: { desafio: filtroDesafio, usuario: grupo } });
    assert.equal(r.corpo.desafios.ativos, await prisma.desafio.count({ where: filtroDesafio }));
    assert.equal(r.corpo.desafios.participantes, new Set(participacoes.map((p) => p.usuarioId)).size);
    assert.equal(r.corpo.desafios.conclusoes, participacoes.filter((p) => p.concluido).length);

    // Nada que identifique alguém
    const texto = JSON.stringify(r.corpo);
    for (const proibido of ["usuarioId", "email", "nome\":\"Ana", "observacao", "senha"]) assert.ok(!texto.includes(proibido), proibido);
  });

  test("filtros, limite de privacidade e validações", async () => {
    const rh = await login("rh@ifsp.com");
    const tec = await chamar("/dashboard?setor=Tecnologia", { token: rh });
    assert.equal(tec.corpo.privacidade.dadosDisponiveis, true);
    assert.equal(tec.corpo.indicadores.colaboradores, await prisma.usuario.count({ where: { setor: "Tecnologia", perfil: "COLABORADOR", ativo: true, onboardingConcluido: true } }));
    assert.ok(tec.corpo.setoresDisponiveis.every((s: string) => s));

    const pequeno = await chamar("/dashboard?setor=Financeiro", { token: rh });
    assert.equal(pequeno.corpo.privacidade.dadosDisponiveis, false);
    assert.equal(pequeno.corpo.indicadores, undefined);
    assert.equal(pequeno.corpo.tendencia, undefined);

    const inexistente = await chamar("/dashboard?setor=Inexistente", { token: rh });
    assert.equal(inexistente.corpo.privacidade.dadosDisponiveis, false);

    const mes = await chamar(`/dashboard?inicio=${chaveData(adicionarDias(hoje(), -29))}&fim=${textoHoje()}`, { token: rh });
    assert.equal(mes.corpo.periodo.dias, 30);
    assert.equal(mes.corpo.tendencia.length, 30);

    assert.equal((await chamar(`/dashboard?inicio=${chaveData(adicionarDias(hoje(), -120))}`, { token: rh })).status, 400);
    assert.equal((await chamar(`/dashboard?inicio=${textoHoje()}&fim=${chaveData(adicionarDias(hoje(), -3))}`, { token: rh })).status, 400);
    assert.equal((await chamar("/dashboard?inicio=2026-02-31", { token: rh })).status, 400);
  });

  test("quem não concluiu o onboarding não entra nos números", async () => {
    const rh = await login("rh@ifsp.com");
    const antes = (await chamar("/dashboard", { token: rh })).corpo.indicadores.colaboradores;
    await chamar("/auth/cadastro", { metodo: "POST", corpo: { nome: "Sem Onboarding", email: `sem.onb.${SUFIXO}@teste.local`, senha: "senhaTeste1" } });
    assert.equal((await chamar("/dashboard", { token: rh })).corpo.indicadores.colaboradores, antes);
  });

  test("colaborador inativo não entra nos números", async () => {
    const rh = await login("rh@ifsp.com");
    const antes = (await chamar("/dashboard", { token: rh })).corpo.indicadores.colaboradores;
    const { id } = await novoColaborador("Inativo");
    assert.equal((await chamar("/dashboard", { token: rh })).corpo.indicadores.colaboradores, antes + 1);
    await prisma.usuario.update({ where: { id }, data: { ativo: false } });
    assert.equal((await chamar("/dashboard", { token: rh })).corpo.indicadores.colaboradores, antes);
  });
});

// ---------------------------------------------------------------------------
// Por último, porque bloqueia o login deste IP por 1 minuto.
describe("segurança: limite de tentativas de login", () => {
  test("logins corretos não contam; a 11ª falha no mesmo minuto recebe 429", async () => {
    // Muitos logins corretos seguidos (vários colegas na mesma rede) não bloqueiam.
    for (let i = 0; i < 15; i++) await login("user@ifsp.com");
    let ultimo = 0;
    for (let i = 0; i < 15; i++) {
      ultimo = (await chamar("/auth/login", { metodo: "POST", corpo: { email: "x@x.com", senha: "y" } })).status;
      if (ultimo === 429) break;
    }
    assert.equal(ultimo, 429);
  });
});
