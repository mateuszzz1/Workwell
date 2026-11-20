/**
 * Testes de integração: sobem a API de verdade (porta aleatória) e usam o banco.
 * Pré-requisito: banco criado e com a carga fictícia (`npm run db:setup`).
 * Rodar: npm run test:integracao
 *
 * Cobrem os fluxos críticos: cadastro, login, onboarding, check-in,
 * desafios e, principalmente, as regras de autorização e privacidade.
 */
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";
import { adicionarDias, chaveData, dataLocal } from "../src/utils/data.js";

const SENHA_DEMO = "workwell123";
let base = "";
let servidor: ReturnType<typeof app.listen>;

/** Faz uma requisição à API e devolve status + corpo JSON. */
async function chamar(caminho: string, opcoes: { metodo?: string; corpo?: unknown; token?: string } = {}) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    ...(opcoes.corpo ? { body: JSON.stringify(opcoes.corpo) } : {}),
  });
  return { status: resposta.status, corpo: (await resposta.json()) as Record<string, any> };
}

async function login(email: string) {
  const { status, corpo } = await chamar("/auth/login", { metodo: "POST", corpo: { email, senha: SENHA_DEMO } });
  assert.equal(status, 200);
  return corpo["token"] as string;
}

before(async () => {
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
});

after(async () => {
  await prisma.usuario.deleteMany({ where: { email: { endsWith: "@teste.local" } } });
  servidor.close();
  await prisma.$disconnect();
});

describe("autenticação", () => {
  test("login com senha errada é recusado com mensagem genérica", async () => {
    const { status, corpo } = await chamar("/auth/login", {
      metodo: "POST",
      corpo: { email: "ana.souza@workwell.local", senha: "errada123" },
    });
    assert.equal(status, 401);
    assert.equal(corpo["erro"], "E-mail ou senha incorretos.");
  });

  test("rotas protegidas exigem token", async () => {
    assert.equal((await chamar("/checkins/resumo")).status, 401);
    assert.equal((await chamar("/checkins/resumo", { token: "token-falso" })).status, 401);
  });

  test("a resposta do login nunca traz o hash da senha", async () => {
    const { corpo } = await chamar("/auth/login", {
      metodo: "POST",
      corpo: { email: "ana.souza@workwell.local", senha: SENHA_DEMO },
    });
    assert.equal(JSON.stringify(corpo).includes("senhaHash"), false);
  });
});

describe("cadastro e onboarding (UC01/UC03)", () => {
  test("novo colaborador só usa o check-in após o onboarding", async () => {
    const email = `novo.${Date.now()}@teste.local`;
    const cadastro = await chamar("/auth/cadastro", {
      metodo: "POST",
      corpo: { nome: "Pessoa Teste", email, senha: "senhaSegura1" },
    });
    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.corpo["usuario"].perfil, "COLABORADOR");
    const token = cadastro.corpo["token"] as string;

    // Antes do onboarding: bloqueado.
    assert.equal((await chamar("/checkins/resumo", { token })).status, 403);

    const onboarding = await chamar("/usuarios/me/onboarding", {
      metodo: "POST",
      token,
      corpo: { nome: "Pessoa Teste", cargo: "Analista", setor: "Comercial", prefNotificacao: true, habitosIniciais: ["water"] },
    });
    assert.equal(onboarding.status, 200);
    assert.equal(onboarding.corpo["onboardingConcluido"], true);

    // Depois: liberado, e o hábito escolhido já existe.
    assert.equal((await chamar("/checkins/resumo", { token })).status, 200);
    const habitos = await chamar("/habitos", { token });
    assert.equal(habitos.corpo["totalCadastrados"], 1);

    // Primeiro check-in vale 10 pontos e a medalha "Primeiro passo".
    // Sono e estresse são opcionais (UC04, fluxo A2).
    const checkin = await chamar("/checkins", { metodo: "POST", token, corpo: { humor: 4, energia: 3, sono: null, estresse: null } });
    assert.equal(checkin.status, 201);
    assert.equal(checkin.corpo["pontosGanhos"], 10);
    assert.deepEqual(checkin.corpo["medalhasNovas"], ["Primeiro passo"]);

    // Editar no mesmo dia não dá pontos de novo.
    const edicao = await chamar("/checkins", { metodo: "POST", token, corpo: { humor: 5, energia: 3 } });
    assert.equal(edicao.status, 200);
    assert.equal(edicao.corpo["pontosGanhos"], 0);

    // Progresso mensal (UC07).
    const mensal = await chamar("/checkins/resumo?dias=30", { token });
    assert.equal(mensal.corpo["dias"], 30);
    assert.equal((await chamar("/checkins/resumo?dias=15", { token })).status, 400);
  });

  test("e-mail repetido é recusado", async () => {
    const { status } = await chamar("/auth/cadastro", {
      metodo: "POST",
      corpo: { nome: "Outra", email: "ana.souza@workwell.local", senha: "senhaSegura1" },
    });
    assert.equal(status, 409);
  });
});

describe("autorização e privacidade", () => {
  test("colaborador não acessa o painel do RH nem cria desafios", async () => {
    const token = await login("bruno.lima@workwell.local");
    assert.equal((await chamar("/dashboard", { token })).status, 403);
    assert.equal(
      (await chamar("/desafios", {
        metodo: "POST",
        token,
        corpo: { titulo: "X", dataInicio: "2026-01-01", dataFim: "2026-01-02", metaRegistros: 1, pontosRecompensa: 0 },
      })).status,
      403,
    );
  });

  test("RH não acessa check-ins nem hábitos", async () => {
    const token = await login("rh.demo@workwell.local");
    assert.equal((await chamar("/checkins/resumo", { token })).status, 403);
    assert.equal((await chamar("/habitos", { token })).status, 403);
  });

  test("não existe rota que liste usuários", async () => {
    const token = await login("rh.demo@workwell.local");
    assert.equal((await chamar("/usuarios", { token })).status, 404);
  });

  test("painel do RH traz só dados agregados", async () => {
    const token = await login("rh.demo@workwell.local");
    const { status, corpo } = await chamar("/dashboard", { token });
    assert.equal(status, 200);
    assert.equal(corpo["privacidade"].dadosDisponiveis, true);
    const texto = JSON.stringify(corpo);
    for (const proibido of ["usuarioId", "email", "Ana Souza", "observacao"]) {
      assert.equal(texto.includes(proibido), false, `o painel não deve conter "${proibido}"`);
    }
  });

  test("setor com menos de 5 pessoas não exibe números", async () => {
    const token = await login("rh.demo@workwell.local");
    const pequeno = await chamar("/dashboard?setor=Financeiro", { token });
    assert.equal(pequeno.corpo["privacidade"].dadosDisponiveis, false);
    assert.equal(pequeno.corpo["indicadores"], undefined);

    const grande = await chamar("/dashboard?setor=Tecnologia", { token });
    assert.equal(grande.corpo["privacidade"].dadosDisponiveis, true);
    assert.deepEqual(grande.corpo["setoresDisponiveis"], ["Tecnologia"]);
  });
});

describe("lembretes (UC09)", () => {
  test("cria, adia, lista e exclui; RH não tem acesso", async () => {
    const token = await login("bruno.lima@workwell.local");
    const criado = await chamar("/lembretes", {
      metodo: "POST",
      token,
      corpo: { tipo: "PAUSA", horario: "10:30", diasSemana: [1, 3], ativo: true },
    });
    assert.equal(criado.status, 201);
    const id = criado.corpo["id"] as number;

    try {
      const adiado = await chamar(`/lembretes/${id}/adiar`, { metodo: "POST", token, corpo: { minutos: 10 } });
      assert.equal(adiado.status, 200);
      assert.equal((await chamar(`/lembretes/${id}/adiar`, { metodo: "POST", token, corpo: { minutos: 7 } })).status, 400);

      const lista = await chamar("/lembretes", { token });
      assert.ok((lista.corpo as unknown as Array<{ id: number }>).some((l) => l.id === id));
      assert.equal((await chamar("/lembretes/pendentes", { token })).status, 200);

      // Outro colaborador não enxerga nem altera o lembrete.
      const outro = await login("camila.rocha@workwell.local");
      assert.equal((await chamar(`/lembretes/${id}`, { metodo: "DELETE", token: outro })).status, 404);

      const rh = await login("rh.demo@workwell.local");
      assert.equal((await chamar("/lembretes", { token: rh })).status, 403);
    } finally {
      assert.equal((await chamar(`/lembretes/${id}`, { metodo: "DELETE", token })).status, 200);
    }
  });
});

describe("desafios (UC08/UC14)", () => {
  test("RH cria, colaborador participa e registra uma vez por dia", async () => {
    const tokenRh = await login("rh.demo@workwell.local");
    // Datas no fuso de São Paulo, igual à API.
    const hoje = chaveData(dataLocal());
    const daquiUmaSemana = chaveData(adicionarDias(dataLocal(), 7));

    const criado = await chamar("/desafios", {
      metodo: "POST",
      token: tokenRh,
      corpo: { titulo: "Desafio de teste", dataInicio: hoje, dataFim: daquiUmaSemana, metaRegistros: 1, pontosRecompensa: 20 },
    });
    assert.equal(criado.status, 201);
    const id = criado.corpo["id"] as number;

    try {
      const tokenColaborador = await login("camila.rocha@workwell.local");
      const pontosAntes = (await chamar("/gamificacao/me", { token: tokenColaborador })).corpo["pontos"] as number;

      assert.equal((await chamar(`/desafios/${id}/participar`, { metodo: "POST", token: tokenColaborador })).status, 201);
      const registro = await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token: tokenColaborador });
      assert.equal(registro.status, 200);
      assert.equal(registro.corpo["concluido"], true);

      const pontosDepois = (await chamar("/gamificacao/me", { token: tokenColaborador })).corpo["pontos"] as number;
      assert.equal(pontosDepois - pontosAntes, 20);

      // Segundo registro no mesmo dia é recusado.
      assert.equal((await chamar(`/desafios/${id}/progresso`, { metodo: "POST", token: tokenColaborador })).status, 409);

      // O RH vê só contagens, sem nomes.
      const listaRh = await chamar("/desafios", { token: tokenRh });
      const doTeste = (listaRh.corpo as unknown as Array<Record<string, unknown>>).find((d) => d["id"] === id)!;
      assert.equal(doTeste["concluidos"], 1);
      assert.equal(JSON.stringify(listaRh.corpo).includes("Camila"), false);

      // Desfaz os pontos ganhos no teste para não alterar a demonstração.
      const camila = await prisma.usuario.findUniqueOrThrow({ where: { email: "camila.rocha@workwell.local" } });
      await prisma.usuario.update({ where: { id: camila.id }, data: { pontosTotal: { decrement: 20 } } });
      await prisma.conquistaMedalha.deleteMany({ where: { usuarioId: camila.id, medalha: { nome: "Desafiante" } } });
    } finally {
      await prisma.desafio.delete({ where: { id } });
    }
  });
});
