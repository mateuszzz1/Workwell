/**
 * Testes de unidade das regras de negócio (não usam o banco).
 * Rodar: npm test
 *
 * Usa o executor de testes nativo do Node (`node:test`): cada `test(...)`
 * descreve um comportamento esperado e `assert` confere o resultado.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calcularSequencia } from "../src/modules/checkins/checkin.regras.js";
import { grupoPodeSerExibido, setoresExibiveis, taxaEngajamento } from "../src/modules/dashboard/dashboard.regras.js";
import { aplicarRegistro, motivoParaNaoRegistrar } from "../src/modules/desafios/desafio.regras.js";
import { deveAparecer, momentoAtual } from "../src/modules/lembretes/lembrete.regras.js";
import { agendado, resumirPeriodo } from "../src/modules/habitos/habito.regras.js";
import { habitoSchema, registroSchema } from "../src/modules/habitos/habito.schema.js";
import { adicionarDias, dataDeTexto } from "../src/utils/data.js";
import { conferirSenha, gerarHashSenha } from "../src/utils/senha.js";
import { gerarToken, lerToken } from "../src/utils/token.js";
import { dataSchema } from "../src/utils/validacao.js";

const dia = dataDeTexto;

describe("senha", () => {
  test("aceita a senha correta e recusa a errada", async () => {
    const hash = await gerarHashSenha("minhaSenha123");
    assert.notEqual(hash, "minhaSenha123"); // nunca guarda a senha pura
    assert.equal(await conferirSenha("minhaSenha123", hash), true);
    assert.equal(await conferirSenha("outraSenha", hash), false);
    assert.equal(await conferirSenha("qualquer", null), false);
  });
});

describe("token", () => {
  const segredo = "x".repeat(40);

  test("lê um token válido", () => {
    const token = gerarToken(7, "COLABORADOR", segredo);
    assert.equal(lerToken(token, segredo)?.usuarioId, 7);
  });

  test("recusa token alterado (ex.: trocar o perfil para RH)", () => {
    const [dados, assinatura] = gerarToken(7, "COLABORADOR", segredo).split(".");
    const falso = Buffer.from(Buffer.from(dados!, "base64url").toString().replace("COLABORADOR", "GESTOR_RH")).toString("base64url");
    assert.equal(lerToken(`${falso}.${assinatura}`, segredo), null);
  });

  test("recusa token assinado com outro segredo ou expirado", () => {
    const token = gerarToken(7, "COLABORADOR", segredo);
    assert.equal(lerToken(token, "y".repeat(40)), null);
    assert.equal(lerToken(token, segredo, Date.now() + 1000 * 60 * 60 * 24 * 30), null);
  });
});

describe("check-in: sequência", () => {
  const hoje = dia("2026-11-20");

  test("conta dias seguidos incluindo hoje", () => {
    const datas = [hoje, adicionarDias(hoje, -1), adicionarDias(hoje, -2), adicionarDias(hoje, -4)];
    assert.equal(calcularSequencia(datas, hoje), 3);
  });

  test("sem check-in hoje, a sequência continua a partir de ontem", () => {
    assert.equal(calcularSequencia([adicionarDias(hoje, -1), adicionarDias(hoje, -2)], hoje), 2);
  });

  test("sem registros recentes, a sequência é zero", () => {
    assert.equal(calcularSequencia([adicionarDias(hoje, -5)], hoje), 0);
  });
});

describe("painel do RH: privacidade", () => {
  test("só exibe grupos com 5 ou mais colaboradores", () => {
    assert.equal(grupoPodeSerExibido(4), false);
    assert.equal(grupoPodeSerExibido(5), true);
  });

  test("filtro de setor oferece só setores grandes o bastante", () => {
    const setores = setoresExibiveis([
      { setor: "Tecnologia", quantidade: 6 },
      { setor: "Financeiro", quantidade: 1 },
      { setor: null, quantidade: 9 },
    ]);
    assert.deepEqual(setores, ["Tecnologia"]);
  });

  test("taxa de engajamento = feitos / esperados", () => {
    assert.equal(taxaEngajamento(35, 5, 7), 100);
    assert.equal(taxaEngajamento(7, 5, 7), 20);
    assert.equal(taxaEngajamento(0, 0, 7), 0);
  });
});

describe("desafios", () => {
  const hoje = dia("2026-11-20");
  const desafio = { status: "ATIVO" as const, dataInicio: dia("2026-11-15"), dataFim: dia("2026-11-30") };

  test("permite um registro por dia", () => {
    assert.equal(motivoParaNaoRegistrar(desafio, { progresso: 1, concluido: false, ultimoRegistro: adicionarDias(hoje, -1) }, hoje), null);
    assert.match(motivoParaNaoRegistrar(desafio, { progresso: 1, concluido: false, ultimoRegistro: hoje }, hoje)!, /hoje/);
  });

  test("bloqueia desafio encerrado ou fora do período", () => {
    const participacao = { progresso: 0, concluido: false, ultimoRegistro: null };
    assert.ok(motivoParaNaoRegistrar({ ...desafio, status: "ENCERRADO" }, participacao, hoje));
    assert.ok(motivoParaNaoRegistrar(desafio, participacao, dia("2026-12-01")));
  });

  test("conclui ao atingir a meta, sem passar dela", () => {
    assert.deepEqual(aplicarRegistro(3, 5), { progresso: 4, concluido: false });
    assert.deepEqual(aplicarRegistro(4, 5), { progresso: 5, concluido: true });
  });
});

describe("hábitos", () => {
  const configuracao = {
    nome: "Hidratação",
    icone: "water" as const,
    meta: 8,
    unidade: "copos" as const,
    frequencia: "DIARIA" as const,
    diasSemana: [],
    quantidadeSemanal: null,
    permitirPausa: true,
    lembretesAtivos: true,
    horarios: ["10:00", "14:00"],
  };

  test("valida a configuração do hábito", () => {
    assert.equal(habitoSchema.safeParse(configuracao).success, true);
    for (const meta of [0, -1, 1.5, 1001]) assert.equal(habitoSchema.safeParse({ ...configuracao, meta }).success, false);
    for (const alteracao of [
      { nome: " " },
      { unidade: "horas" }, // água não é medida em horas
      { horarios: ["25:00"] },
      { horarios: ["10:00", "10:00"] },
      { frequencia: "DIAS_ESPECIFICOS" }, // sem dias escolhidos
      { usuarioId: 3 }, // campo extra proibido
    ]) {
      assert.equal(habitoSchema.safeParse({ ...configuracao, ...alteracao }).success, false);
    }
  });

  test("valida datas e registros", () => {
    assert.equal(dataSchema.safeParse("2026-02-31").success, false);
    assert.equal(registroSchema.safeParse({ data: "2026-10-07", valor: -1, pausado: false }).success, false);
  });

  const registro = (data: string, valor: number, pausado = false) => ({
    data: dia(data),
    valor,
    pausado,
    concluido: !pausado && valor >= 8,
    metaAlvo: 8,
    avaliacaoSono: null,
  });
  const meta = {
    id: 1,
    frequenciaAlvo: 8,
    periodo: "DIARIA",
    diasSemana: [],
    quantidadeSemanal: null,
    dataInicio: dia("2026-10-05"),
    dataFim: null,
    registros: [registro("2026-10-05", 8), registro("2026-10-06", 3, true), registro("2026-10-07", 8)],
  };
  const referencia = dia("2026-10-07");

  test("dia pausado não quebra a sequência", () => {
    assert.equal(resumirPeriodo([meta], referencia, referencia).sequencia, 2);
    assert.equal(resumirPeriodo([meta], referencia, referencia).semana, 100);
  });

  test("respeita dias da semana e a cota semanal", () => {
    // 2026-10-07 é quarta-feira (3); o hábito só vale às segundas (1).
    assert.equal(agendado({ ...meta, diasSemana: [1], registros: [] }, referencia), false);
    assert.equal(agendado({ ...meta, diasSemana: [1] }, referencia), true); // já tem registro: aparece
    assert.equal(
      agendado({ ...meta, periodo: "SEMANAL", quantidadeSemanal: 1, registros: meta.registros.slice(0, 2) }, referencia),
      false,
    );
  });
});

describe("lembretes (UC09)", () => {
  const agora = new Date("2026-11-20T18:00:00Z"); // sexta-feira, 15:00 em São Paulo
  const momento = { agora, horario: "15:00", diaSemana: 5 };
  const base = { ativo: true, horario: "15:00", diasSemana: [1, 2, 3, 4, 5], adiadoAte: null };

  test("calcula horário e dia da semana no fuso de São Paulo", () => {
    assert.deepEqual(momentoAtual(agora), momento);
  });

  test("aparece no horário e nos dias escolhidos", () => {
    assert.equal(deveAparecer(base, momento), true);
    assert.equal(deveAparecer({ ...base, horario: "15:01" }, momento), false);
    assert.equal(deveAparecer({ ...base, diasSemana: [0, 6] }, momento), false);
    assert.equal(deveAparecer({ ...base, diasSemana: [] }, momento), true); // vazio = todos os dias
    assert.equal(deveAparecer({ ...base, ativo: false }, momento), false);
  });

  test("adiado: espera o novo horário", () => {
    const daqui10min = new Date(agora.getTime() + 10 * 60_000);
    assert.equal(deveAparecer({ ...base, adiadoAte: daqui10min }, momento), false);
    assert.equal(deveAparecer({ ...base, adiadoAte: daqui10min }, { ...momento, agora: daqui10min, horario: "15:10" }), true);
  });
});
