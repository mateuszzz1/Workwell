# Mapa do código — WorkWell

Onde está cada parte do WorkWell e como foi feita, com o trecho de código correspondente.

---

## 1. Organização do código

**Backend** (`api/src/modules/<assunto>/`): cada assunto é uma pasta, e toda pasta tem os mesmos arquivos.

| Arquivo | Papel | Analogia |
|---|---|---|
| `*.routes.ts` | Quais endereços existem e quem pode usar | Porteiro |
| `*.schema.ts` | Recusa dados errados (Zod) | Conferência |
| `*.controller.ts` | Lê o pedido, chama o service e responde | Atendente |
| `*.service.ts` | Regras de negócio e acesso ao banco | Cozinha |
| `*.regras.ts` | Cálculos puros, testados sem banco | Receita |

Assuntos: `auth` (login), `usuarios` (perfil e onboarding), `checkins`, `habitos`, `lembretes`, `desafios`, `gamificacao` (pontos e medalhas), `dashboard` (painel do RH), `health` (servidor no ar).

**Frontend** (`web/src/`): `pages/` são as telas, `components/` são as peças das telas, `services/` são as chamadas à API.

---

## 2. Onde está?

### Login e segurança

| Onde está… | Arquivo | Procure por |
|---|---|---|
| Cadastro e login | [auth.service.ts](../api/src/modules/auth/auth.service.ts) | `cadastrar`, `login` |
| Senha guardada com hash | [senha.ts](../api/src/utils/senha.ts) | `gerarHashSenha`, `conferirSenha` |
| Token de login (“crachá digital”) | [token.ts](../api/src/utils/token.ts) | `gerarToken`, `lerToken` |
| Quem pode usar cada rota | [autenticacao.ts](../api/src/middlewares/autenticacao.ts) | `autenticar`, `exigirPerfil`, `exigirOnboarding` |
| Bloqueio após 10 senhas erradas | [limitar-requisicoes.ts](../api/src/middlewares/limitar-requisicoes.ts) | `limitarTentativasFalhas` |
| Segredo do token e configurações | [env.ts](../api/src/config/env.ts) | `TOKEN_SECRET`, `TOKEN_HORAS` |
| Tela de login e cadastro | [AcessoPage.tsx](../web/src/pages/acesso/AcessoPage.tsx) | `enviar` |
| Onde o site guarda o login | [api.ts (web)](../web/src/services/api.ts) | `definirToken` |

### Colaborador

| Onde está… | Arquivo | Procure por |
|---|---|---|
| Onboarding | [usuario.service.ts](../api/src/modules/usuarios/usuario.service.ts) e [OnboardingPage.tsx](../web/src/pages/acesso/OnboardingPage.tsx) | `concluirOnboarding` |
| Editar perfil | [usuario.service.ts](../api/src/modules/usuarios/usuario.service.ts) e [PerfilPage.tsx](../web/src/pages/colaborador/PerfilPage.tsx) | `atualizarPerfil` |
| Salvar o check-in | [checkin.service.ts](../api/src/modules/checkins/checkin.service.ts) | `salvar` |
| Resumo e médias do check-in | [checkin.service.ts](../api/src/modules/checkins/checkin.service.ts) | `obterResumo` |
| Sequência de dias seguidos | [checkin.regras.ts](../api/src/modules/checkins/checkin.regras.ts) | `calcularSequencia` |
| Tela do check-in | [InicioPage.tsx](../web/src/pages/colaborador/InicioPage.tsx) e [FormularioCheckin.tsx](../web/src/components/checkin/FormularioCheckin.tsx) | `salvar` |
| Gráfico da semana e do mês | [GraficoCheckins.tsx](../web/src/components/checkin/GraficoCheckins.tsx) e [ProgressoPage.tsx](../web/src/pages/colaborador/ProgressoPage.tsx) | `diasDoPeriodo` |
| Criar e registrar hábitos | [habito.service.ts](../api/src/modules/habitos/habito.service.ts) | `criar`, `registrar` |
| Em que dias o hábito aparece | [habito.regras.ts](../api/src/modules/habitos/habito.regras.ts) | `agendado`, `situacao` |
| Tela de hábitos | [HabitosPage.tsx](../web/src/pages/colaborador/HabitosPage.tsx) | — |
| Lembretes (regras) | [lembrete.regras.ts](../api/src/modules/lembretes/lembrete.regras.ts) | `deveAparecer` |
| Lembretes (pendentes, adiar) | [lembrete.service.ts](../api/src/modules/lembretes/lembrete.service.ts) | `pendentes`, `adiar` |
| Aviso de lembrete na tela | [AvisoLembretes.tsx](../web/src/components/layout/AvisoLembretes.tsx) | `INTERVALO` |
| Participar e registrar desafio | [desafio.service.ts](../api/src/modules/desafios/desafio.service.ts) | `participar`, `registrarProgresso` |
| Regra de um registro por dia | [desafio.regras.ts](../api/src/modules/desafios/desafio.regras.ts) | `motivoParaNaoRegistrar` |
| Valor dos pontos e medalhas | [gamificacao.regras.ts](../api/src/modules/gamificacao/gamificacao.regras.ts) | `PONTOS`, `MEDALHAS` |
| Dar pontos e medalhas | [gamificacao.service.ts](../api/src/modules/gamificacao/gamificacao.service.ts) | `adicionarPontos`, `concederMedalha` |

### Gestor de RH

| Onde está… | Arquivo | Procure por |
|---|---|---|
| Regra dos 5 | [dashboard.regras.ts](../api/src/modules/dashboard/dashboard.regras.ts) | `LIMIAR_MINIMO`, `grupoPodeSerExibido` |
| Setores que aparecem no filtro | [dashboard.regras.ts](../api/src/modules/dashboard/dashboard.regras.ts) | `setoresExibiveis` |
| Taxa de engajamento | [dashboard.regras.ts](../api/src/modules/dashboard/dashboard.regras.ts) | `taxaEngajamento` |
| Montagem do painel e filtros | [dashboard.service.ts](../api/src/modules/dashboard/dashboard.service.ts) | `obterResumo` |
| Tela do painel | [PainelRhPage.tsx](../web/src/pages/rh/PainelRhPage.tsx) | `aplicar` |
| Criar, listar e encerrar desafios | [desafio.service.ts](../api/src/modules/desafios/desafio.service.ts) e [DesafiosRhPage.tsx](../web/src/pages/rh/DesafiosRhPage.tsx) | `criar`, `listarParaRh`, `encerrar` |

### Banco, estrutura e testes

| Onde está… | Arquivo | Procure por |
|---|---|---|
| As tabelas do banco | [schema.prisma](../api/prisma/schema.prisma) | `model` |
| Histórico de mudanças do banco | [migrations](../api/prisma/migrations) | uma pasta por mudança |
| Dados fictícios | [seed.ts](../api/prisma/seed.ts) | `COLABORADORES`, `SENHA_DEMO` |
| Restaurar a demonstração | [reset-demo.ts](../api/prisma/reset-demo.ts) | — |
| Conexão com o banco | [prisma.ts](../api/src/database/prisma.ts) | `prisma` |
| Lista de todas as rotas | [routes/index.ts](../api/src/routes/index.ts) | `routes.use` |
| Montagem do servidor | [app.ts](../api/src/app.ts) | `app.use` |
| Tratamento de erros | [error-handler.ts](../api/src/middlewares/error-handler.ts) e [AppError.ts](../api/src/errors/AppError.ts) | `errorHandler` |
| Qual tela mostrar para cada perfil | [App.tsx](../web/src/App.tsx) | `OnboardingPage`, `paginaInicial` |
| Menu e barra do celular | [AppLayout.tsx](../web/src/components/layout/AppLayout.tsx) e [ColaboradorNav.tsx](../web/src/components/layout/ColaboradorNav.tsx) | `MENU_COLABORADOR`, `MENU_RH` |
| Todas as chamadas à API (site) | [workwell.ts](../web/src/services/workwell.ts) | nome da ação |
| Cores e fontes | [tokens.css](../web/src/styles/tokens.css) | `--cor-floresta` |
| Testes das regras | [regras.test.ts](../api/tests/regras.test.ts) | `describe` |
| Testes do sistema inteiro | [sistema.integracao.test.ts](../api/tests/sistema.integracao.test.ts) e [api.integracao.test.ts](../api/tests/api.integracao.test.ts) | `describe` |
| Hospedagem | [railway.json](../railway.json) e [package.json da raiz](../package.json) | `buildCommand`, `start` |

---

## 3. Como foi feito

### 3.1 Como funciona a regra dos 5?

**Resumo:** Antes de montar o painel, o servidor conta quantos colaboradores estão no recorte. Se forem menos de 5, ele devolve a resposta sem nenhum número.

**Arquivo:** [dashboard.regras.ts](../api/src/modules/dashboard/dashboard.regras.ts), função `grupoPodeSerExibido`, e o uso dela em [dashboard.service.ts](../api/src/modules/dashboard/dashboard.service.ts), no passo “3) Regra de privacidade”.

```ts
export const LIMIAR_MINIMO = 5;

/** Período máximo que o filtro aceita, para manter a consulta leve. */
export const MAXIMO_DIAS_PERIODO = 90;

/** O grupo é grande o bastante para ser exibido sem risco de identificar alguém? */
export function grupoPodeSerExibido(quantidadeColaboradores: number) {
  return quantidadeColaboradores >= LIMIAR_MINIMO;
}
```

**Detalhes:** a regra fica no servidor, não na tela; mesmo que alguém peça o recorte direto à API, a resposta vem sem números. O filtro de setor só oferece setores com 5 ou mais pessoas (`setoresExibiveis`). Só contam colaboradores ativos que concluíram o onboarding.

### 3.2 Como o RH é impedido de ver dados individuais?

**Resumo:** Toda rota diz quais perfis podem usá-la. As rotas de check-in, hábitos e lembretes só aceitam colaborador; o RH recebe ‘sem permissão’. E não existe nenhuma rota que liste pessoas.

**Arquivo:** [checkin.routes.ts](../api/src/modules/checkins/checkin.routes.ts) e a função `exigirPerfil` em [autenticacao.ts](../api/src/middlewares/autenticacao.ts).

```ts
checkinRoutes.use(autenticar, exigirPerfil("COLABORADOR"), exigirOnboarding);
checkinRoutes.get("/resumo", controller.resumo);
checkinRoutes.post("/", controller.salvar);
```

**Detalhes:** o painel do RH (`dashboard.service.ts`) só devolve médias, contagens e taxas. Os testes conferem que a resposta não contém `usuarioId`, e-mail, nome nem observação.

### 3.3 Como o sistema sabe quem está logado? E se eu trocar um número na página?

**Resumo:** O sistema identifica a pessoa pelo token de login, nunca por um número que vem da página. Então trocar um número não mostra dados de outra pessoa.

**Arquivo:** função `autenticar` em [autenticacao.ts](../api/src/middlewares/autenticacao.ts).

```ts
const cabecalho = req.get("authorization") ?? "";
const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
const dados = lerToken(token);

if (!dados) {
  throw new AppError("Faça login para continuar.", 401);
}
```

**Detalhes:** depois de ler o token, ela confere no banco se o usuário existe e está ativo; um usuário desativado perde o acesso mesmo com token válido. Os services sempre filtram pelo `usuarioId` que veio do token.

### 3.4 Como a senha é guardada?

**Resumo:** A senha passa pelo scrypt, um cálculo que não pode ser desfeito, junto com um ‘sal’ aleatório. Guardamos só o resultado. Nem quem acessa o banco descobre a senha.

**Arquivo:** função `gerarHashSenha` em [senha.ts](../api/src/utils/senha.ts).

```ts
export async function gerarHashSenha(senha: string) {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, TAMANHO_HASH);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}
```

**Detalhes:** o sal faz duas pessoas com a mesma senha terem códigos diferentes. No login, `conferirSenha` refaz o cálculo e compara com `timingSafeEqual`, que não revela quantos caracteres acertaram. A mensagem de erro é a mesma para e-mail inexistente e senha errada.

### 3.5 Como funciona o token (“crachá digital”)?

**Resumo:** O token tem duas partes: os dados da pessoa (id, perfil e validade) e uma assinatura feita com uma chave secreta que só o servidor conhece. Se alguém alterar os dados, a assinatura não bate e o acesso é negado.

**Arquivo:** funções `gerarToken` e `lerToken` em [token.ts](../api/src/utils/token.ts).

```ts
export function gerarToken(usuarioId: number, perfil: PerfilUsuario, segredo = env.TOKEN_SECRET, agora = Date.now()) {
  const dados: DadosToken = { usuarioId, perfil, expiraEm: agora + env.TOKEN_HORAS * 60 * 60 * 1000 };
  const dadosCodificados = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return `${dadosCodificados}.${assinar(dadosCodificados, segredo)}`;
}
```

**Detalhes:** é a mesma ideia de um JWT, com assinatura HMAC-SHA256, escrita em poucas linhas para conseguirmos explicar. Vale 8 horas. O site guarda o token no `localStorage` e envia no cabeçalho `Authorization` ([api.ts do site](../web/src/services/api.ts)). Em produção, a API não sobe sem um `TOKEN_SECRET` próprio.

### 3.6 Como funciona o bloqueio por tentativas?

**Resumo:** O servidor conta as respostas com erro de cada endereço de internet. Depois de 10 erros no mesmo minuto, ele recusa novas tentativas por um minuto. Logins corretos não contam.

**Arquivo:** função `limitarTentativasFalhas` em [limitar-requisicoes.ts](../api/src/middlewares/limitar-requisicoes.ts).

**Detalhes:** só os erros contam para não bloquear colegas que usam a mesma rede da empresa. Os contadores ficam na memória do servidor, o que basta para um servidor só.

### 3.7 Como garantem um check-in por dia, com edição?

**Resumo:** O banco tem uma regra que não aceita dois check-ins da mesma pessoa no mesmo dia. O servidor usa ‘criar ou atualizar’: se já existe o de hoje, ele atualiza em vez de criar outro, e aí não dá pontos.

**Arquivo:** o `@@unique` em [schema.prisma](../api/prisma/schema.prisma) (modelo `Checkin`) e a função `salvar` em [checkin.service.ts](../api/src/modules/checkins/checkin.service.ts).

```prisma
@@unique([usuarioId, data])
```

```ts
const checkin = await tx.checkin.upsert({
  where: { usuarioId_data: { usuarioId, data: hoje } },
  update: valores,
  create: { usuarioId, data: hoje, ...valores },
  select: camposCheckin,
});

if (existente) {
  return { checkin, criado: false, pontosGanhos: 0, medalhasNovas: [], mensagem: "Check-in de hoje atualizado." };
}
```

**Detalhes:** tudo acontece numa transação (`prisma.$transaction`): check-in, pontos e medalhas são gravados juntos ou nada é gravado.

### 3.8 Como funcionam os pontos e as medalhas?

**Resumo:** Os valores ficam num lugar só: 10 pontos pelo check-in e 2 por hábito concluído no dia. Os outros módulos chamam ‘adicionar pontos’ e ‘conceder medalha’, que só dá a medalha se a pessoa ainda não tiver.

**Arquivo:** `PONTOS` e `MEDALHAS` em [gamificacao.regras.ts](../api/src/modules/gamificacao/gamificacao.regras.ts) e `concederMedalha` em [gamificacao.service.ts](../api/src/modules/gamificacao/gamificacao.service.ts).

```ts
export const PONTOS = {
  /** Primeiro check-in do dia (editar o check-in não dá pontos de novo). */
  CHECKIN: 10,
  /** Hábito concluído no dia de hoje. */
  HABITO_CONCLUIDO: 2,
} as const;
```

**Detalhes:** as medalhas são Primeiro passo (1º check-in), Consistência (7 dias seguidos, calculado por `calcularSequencia`) e Desafiante (1º desafio concluído). A recompensa de um desafio é o valor que o RH definiu ao criá-lo.

### 3.9 Como impedem trapaça nos pontos dos hábitos?

**Resumo:** Os pontos só mudam quando o hábito de hoje passa de ‘não concluído’ para ‘concluído’, ou o contrário. Se a pessoa desmarcar, perde os 2 pontos. Dias passados não dão pontos.

**Arquivo:** função `registrar` em [habito.service.ts](../api/src/modules/habitos/habito.service.ts), no comentário “Pontos: só para o dia de hoje”.

```ts
// Pontos: só para o dia de hoje e só quando a situação "concluído" muda.
if (chaveData(dia) === chaveData(hoje) && atual.concluido !== novo.concluido) {
  await adicionarPontos(tx, usuarioId, novo.concluido ? PONTOS.HABITO_CONCLUIDO : -PONTOS.HABITO_CONCLUIDO);
}
```

### 3.10 Como o desafio aceita só um registro por dia?

**Resumo:** Cada participação guarda a data do último registro. Antes de registrar, uma função confere se o desafio está aberto, se a pessoa já concluiu e se já registrou hoje.

**Arquivo:** função `motivoParaNaoRegistrar` em [desafio.regras.ts](../api/src/modules/desafios/desafio.regras.ts).

```ts
export function motivoParaNaoRegistrar(desafio: DesafioRegra, participacao: ParticipacaoRegra, hoje: Date) {
  if (!desafioAberto(desafio, hoje)) return "Este desafio não está aberto hoje.";
  if (participacao.concluido) return "Você já concluiu este desafio.";
  if (participacao.ultimoRegistro && chaveData(participacao.ultimoRegistro) === chaveData(hoje)) {
    return "Você já registrou este desafio hoje. Volte amanhã!";
  }
  return null;
}
```

**Detalhes:** ao atingir a meta, `registrarProgresso` em [desafio.service.ts](../api/src/modules/desafios/desafio.service.ts) marca como concluído, dá os pontos e a medalha Desafiante, tudo numa transação.

### 3.11 Como os lembretes funcionam sem notificação push?

**Resumo:** Com o site aberto, a página pergunta ao servidor a cada 30 segundos se algum lembrete deve aparecer naquele minuto. O servidor decide e a página mostra o aviso, com o botão de adiar.

**Arquivo:** `INTERVALO` em [AvisoLembretes.tsx](../web/src/components/layout/AvisoLembretes.tsx) e `deveAparecer` em [lembrete.regras.ts](../api/src/modules/lembretes/lembrete.regras.ts).

```ts
export function deveAparecer(lembrete: LembreteRegra, momento: Momento) {
  if (!lembrete.ativo) return false;

  // Adiado: aparece assim que o horário do adiamento chegar.
  if (lembrete.adiadoAte) return momento.agora >= lembrete.adiadoAte;

  const diaEscolhido = lembrete.diasSemana.length === 0 || lembrete.diasSemana.includes(momento.diaSemana);
  return diaEscolhido && lembrete.horario === momento.horario;
}
```

**Detalhes:** adiar grava no banco até quando o lembrete fica adiado (`adiadoAte`). O lembrete de check-in não aparece se o check-in de hoje já foi feito, e nenhum aparece se a pessoa desligou os lembretes no perfil (`pendentes` em [lembrete.service.ts](../api/src/modules/lembretes/lembrete.service.ts)).

### 3.12 Como validam os dados que chegam?

**Resumo:** Com a biblioteca Zod. Cada rota tem um ‘formato esperado’; se o dado não bate, como uma nota 9 numa escala de 1 a 5, a API responde com erro e diz qual campo está errado.

**Arquivo:** [checkin.schema.ts](../api/src/modules/checkins/checkin.schema.ts).

```ts
const escala = z.coerce.number().int().min(1).max(5);

export const salvarCheckinSchema = z.object({
  humor: escala,
  energia: escala,
  sono: escala.nullable().optional(),
  estresse: escala.nullable().optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
});
```

**Detalhes:** o banco também tem regras próprias (restrições), como notas entre 1 e 5, que barram o dado mesmo se alguém pular a API. Os erros viram respostas em [error-handler.ts](../api/src/middlewares/error-handler.ts).

### 3.13 Como calculam a sequência de dias?

**Resumo:** A função anda para trás, dia por dia, contando enquanto houver check-in. Se a pessoa ainda não fez o de hoje, começa a contar de ontem, porque o dia ainda não acabou.

**Arquivo:** função `calcularSequencia` em [checkin.regras.ts](../api/src/modules/checkins/checkin.regras.ts).

### 3.14 Como tratam o horário e o “dia” do check-in?

**Resumo:** O ‘dia’ é sempre o dia no horário de São Paulo, para um check-in feito às 22h não cair no dia seguinte por causa do fuso do servidor.

**Arquivo:** função `dataLocal` em [data.ts](../api/src/utils/data.ts), com `FUSO_HORARIO = "America/Sao_Paulo"`.

### 3.15 Como o banco foi criado e alterado?

**Resumo:** O modelo das tabelas está no arquivo do Prisma. Cada mudança vira uma migração, um passo registrado com o SQL gerado. Assim qualquer computador monta o mesmo banco com um comando.

**Arquivo:** [schema.prisma](../api/prisma/schema.prisma) e a pasta [migrations](../api/prisma/migrations) (9 migrações).

**Detalhes:** o diagrama do relatório tem 11 entidades; no banco são 13 tabelas, porque participação em desafio e conquista de medalha ganharam tabelas próprias. O alerta de engajamento não aponta o colaborador, por privacidade. Usamos PostgreSQL em vez do MySQL do relatório; o modelo é o mesmo.

### 3.16 De onde vêm os dados da demonstração?

**Resumo:** De um script de carga com dados fictícios: 10 colaboradores, 1 gestora, 7 dias de check-ins e um desafio. Ele pode rodar várias vezes sem duplicar nada.

**Arquivo:** [seed.ts](../api/prisma/seed.ts) (usa `upsert`, que cria ou atualiza) e [reset-demo.ts](../api/prisma/reset-demo.ts), que deixa a Ana com o check-in de hoje pendente.

### 3.17 Como testaram o sistema?

**Resumo:** Com 53 testes automáticos. Vinte testam as regras sozinhas; 33 sobem o sistema, fazem as ações como um usuário e conferem no banco o que foi gravado. Eles acharam 7 erros, que corrigimos.

**Arquivo:** [regras.test.ts](../api/tests/regras.test.ts), por exemplo o teste da regra dos 5:

```ts
test("só exibe grupos com 5 ou mais colaboradores", () => {
  assert.equal(grupoPodeSerExibido(4), false);
  assert.equal(grupoPodeSerExibido(5), true);
});
```

**Detalhes:** os testes do sistema inteiro estão em [sistema.integracao.test.ts](../api/tests/sistema.integracao.test.ts). Rodam com `npm test` e `npm run test:integracao`, na pasta `api`.

### 3.18 Como o site chega ao usuário? Onde está hospedado?

**Resumo:** No Railway. Em produção, um único servidor entrega as telas e responde à API no mesmo endereço, e o banco PostgreSQL fica no mesmo projeto. Cada atualização na branch main do GitHub publica uma versão nova.

**Arquivo:** [app.ts](../api/src/app.ts), parte que serve o site compilado, e [railway.json](../railway.json).

```ts
const pastaSite = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(pastaSite)) {
  app.use(express.static(pastaSite));
```

**Detalhes:** ao iniciar, o servidor aplica as migrações e roda a carga de dados antes de abrir. O diagrama completo está no [README](../README.md#arquitetura).

### 3.19 Como o site decide qual tela mostrar?

**Resumo:** Pelo usuário logado: sem login, mostra a tela de acesso; colaborador sem onboarding vai para o onboarding; depois, cada perfil vê o próprio menu.

**Arquivo:** [App.tsx](../web/src/App.tsx).

```tsx
if (!usuario) {
  return <AcessoPage />;
}

if (usuario.perfil === "COLABORADOR" && !usuario.onboardingConcluido) {
  return <OnboardingPage />;
}
```

**Detalhes:** esconder a tela não é a proteção; a proteção real está no servidor (item 3.2). O menu de cada perfil está em [AppLayout.tsx](../web/src/components/layout/AppLayout.tsx).

### 3.20 Como o site conversa com o servidor?

**Resumo:** Todas as chamadas passam por um único arquivo, que acrescenta o token de login e transforma os erros da API em mensagens para a tela.

**Arquivo:** [api.ts do site](../web/src/services/api.ts) e a lista de chamadas em [workwell.ts](../web/src/services/workwell.ts).

```ts
...(token ? { Authorization: `Bearer ${token}` } : {}),
```

---

## 4. O caminho de um check-in, arquivo por arquivo

1. A pessoa clica em **Concluir check-in** em [FormularioCheckin.tsx](../web/src/components/checkin/FormularioCheckin.tsx).
2. [InicioPage.tsx](../web/src/pages/colaborador/InicioPage.tsx) chama `salvarCheckin` em [workwell.ts](../web/src/services/workwell.ts).
3. [api.ts do site](../web/src/services/api.ts) envia o pedido para `/api/checkins` com o token.
4. No servidor, [app.ts](../api/src/app.ts) e [routes/index.ts](../api/src/routes/index.ts) mandam o pedido para [checkin.routes.ts](../api/src/modules/checkins/checkin.routes.ts).
5. Os porteiros rodam: `autenticar` (quem é), `exigirPerfil("COLABORADOR")` (pode?) e `exigirOnboarding`.
6. [checkin.controller.ts](../api/src/modules/checkins/checkin.controller.ts) valida os dados com `salvarCheckinSchema`.
7. [checkin.service.ts](../api/src/modules/checkins/checkin.service.ts) `salvar` grava o check-in, os pontos e as medalhas numa transação.
8. A resposta volta, e a tela mostra “Check-in registrado. Você ganhou 10 pontos!” e atualiza os pontos no topo.

