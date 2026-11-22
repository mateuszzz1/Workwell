# Perguntas sobre o código

Cada pergunta traz a resposta curta, o arquivo, o trecho do código que responde e o motivo da escolha, em linguagem simples. Os caminhos partem da pasta do projeto: `api/...` é o servidor e `web/...` é o site.

## Como ler os trechos

O sistema tem três partes:

| Parte | Onde fica | O que faz |
|---|---|---|
| Site | pasta `web/` | As telas que a pessoa vê e clica. Feito em React. |
| API (servidor) | pasta `api/` | Recebe cada pedido do site, confere quem pediu, aplica as regras e responde. Feita em Node.js com Express. |
| Banco de dados | PostgreSQL | Guarda tudo em tabelas. A API lê e grava nele usando o Prisma. |

Uma comparação: o site é o balcão de uma lanchonete, onde o cliente faz o pedido; a API é a cozinha, que confere o pedido e prepara; o banco é o estoque, onde tudo fica guardado.

Palavras que aparecem nos trechos:

| No código | Significa |
|---|---|
| `function nome(...)` | uma função: um bloco de passos com nome, que outros lugares podem chamar |
| `const x = ...` | guarda um valor com um nome, para usar depois |
| `if (condição) ...` | "se": só faz o que vem depois quando a condição é verdadeira |
| `return` | termina a função e devolve uma resposta |
| `throw new AppError("...", 401)` | interrompe tudo e responde um erro com aquela mensagem e aquele código |
| `await` | espera uma tarefa demorada terminar (por exemplo, uma consulta ao banco) |
| `prisma.checkin.findMany(...)` | pede ao banco os registros da tabela `Checkin` |
| `create`, `update`, `upsert` | grava um registro novo, altera um existente, ou "altera se existe, cria se não existe" |
| `where: { ... }` | o filtro da consulta: quais registros buscar |
| `res.json(...)` | envia a resposta da API para o site |
| `// texto` ou `/** texto */` | comentário: explicação para pessoas; o computador ignora |
| Rota | um endereço da API, como `POST /api/checkins`: é o "pedido" que o site faz |
| Middleware | um porteiro: código que roda antes da rota e pode barrar o pedido |
| Token | um crachá digital que o site recebe no login e mostra em cada pedido |

Códigos de resposta: **200/201** deu certo; **400** dados errados; **401** não está logado; **403** está logado, mas não tem permissão; **404** não encontrado; **409** conflito (já existe, já fez hoje); **429** tentativas demais; **500** erro interno.

---

## Visão geral

### 1. Como o sistema está dividido e como as partes se falam?

**Resposta:** são três partes: o site, a API e o banco. Na hospedagem, um único programa (a API) entrega o site e responde aos pedidos no mesmo endereço.

**Arquivo:** `api/src/app.ts`, linhas 33 a 44

```ts
app.use("/api", routes);

// Site compilado (npm run build na pasta web). Em desenvolvimento quem serve o
// site é o Vite (porta 5173); em produção, a própria API serve tudo num endereço só.
const pastaSite = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(pastaSite)) {
  app.use(express.static(pastaSite));
  // Qualquer endereço que não seja da API devolve o index.html (o React decide a tela).
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile("index.html", { root: pastaSite });
  });
}
```

**Lendo o trecho:**
- Endereços que começam com `/api` vão para as rotas da API (os pedidos de dados).
- `pastaSite` é a pasta `web/dist`, onde fica o site já pronto (compilado).
- `express.static` entrega os arquivos do site: HTML, JavaScript, CSS e imagens.
- Qualquer outro endereço devolve a página principal, e o React decide qual tela mostrar.

**Por quê:** um endereço só é mais simples de hospedar e dispensa configurações extras entre dois domínios. No computador, durante o desenvolvimento, site e API rodam separados para que cada mudança apareça na hora.

### 2. Onde o servidor começa a funcionar?

**Arquivo:** `api/src/server.ts`, linhas 11 a 13

```ts
const server = app.listen(env.PORT, () => {
  console.log(`API em http://localhost:${env.PORT}/api`);
});
```

**Lendo o trecho:** `app.listen` "abre a porta": a partir daqui o servidor aceita pedidos. A porta vem da configuração (`env.PORT`): 3333 no computador; no Railway, a porta que a hospedagem indicar.

**Por quê:** a montagem da aplicação (`app.ts`) fica separada da abertura da porta (`server.ts`). Assim os testes sobem a mesma aplicação numa porta livre qualquer, sem conflito com o servidor em uso.

### 3. Quais tecnologias e bibliotecas o projeto usa?

**Arquivo:** `api/package.json`, linhas 28 a 35

```json
  "dependencies": {
    "@prisma/adapter-pg": "^7.9.1",
    "@prisma/client": "^7.9.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "zod": "^4.4.3"
  },
```

**Lendo o trecho:**
- `express`: monta o servidor e as rotas.
- `@prisma/client` e `@prisma/adapter-pg`: conversam com o PostgreSQL.
- `zod`: confere se os dados recebidos estão certos.
- `cors`: define qual site pode chamar a API pelo navegador.
- `dotenv`: lê as configurações do arquivo `.env`.
- No site (`web/package.json`, linhas 16 a 20), as bibliotecas são só `react`, `react-dom` (as telas) e `lucide-react` (os ícones).

**Por quê:** poucas bibliotecas, todas muito usadas. Senha e token usam o módulo `crypto`, que já vem no Node.js, sem biblioteca extra. Tudo é escrito em TypeScript, a mesma linguagem no site e no servidor.

### 4. Como a API sabe qual código executar para cada pedido?

**Arquivo:** `api/src/routes/index.ts`, linhas 28 a 36

```ts
routes.use("/health", healthRoutes); // estado da API e do banco
routes.use("/auth", authRoutes); // cadastro e login (UC01, UC02)
routes.use("/usuarios", usuarioRoutes); // perfil e onboarding (UC01, UC03)
routes.use("/checkins", checkinRoutes); // check-in diário (UC04, UC07)
routes.use("/habitos", habitoRoutes); // metas, hábitos e lembretes (UC05, UC06, UC09)
routes.use("/lembretes", lembreteRoutes); // lembretes de pausa, descanso e check-in (UC09)
routes.use("/desafios", desafioRoutes); // desafios (UC08, UC14)
routes.use("/gamificacao", gamificacaoRoutes); // pontos e medalhas (UC10)
routes.use("/dashboard", dashboardRoutes); // painel agregado do RH (UC11)
```

**Lendo o trecho:** cada linha liga o começo de um endereço a um módulo. Tudo que começa com `/api/checkins`, por exemplo, vai para o módulo de check-in. O comentário no fim da linha diz qual caso de uso (UC) o módulo atende.

**Por quê:** é o índice da API. Para achar qualquer funcionalidade, basta olhar aqui e abrir a pasta do módulo em `api/src/modules/`.

### 5. Por que cada módulo tem vários arquivos (routes, controller, schema, service, regras)?

**Resposta:** cada arquivo tem uma só tarefa, e todos os módulos seguem a mesma divisão.

**Arquivo:** `api/src/modules/checkins/checkin.controller.ts`, linhas 15 a 20

```ts
/** POST /api/checkins -> cria (201) ou atualiza (200) o check-in de hoje. */
export async function salvar(req: Request, res: Response) {
  const dados = salvarCheckinSchema.parse(req.body);
  const resultado = await checkinService.salvar(usuarioLogado(res).id, dados);
  res.status(resultado.criado ? 201 : 200).json(resultado);
}
```

**Lendo o trecho:**
- `salvarCheckinSchema.parse(req.body)`: confere os dados enviados, com as regras do arquivo *schema*.
- `checkinService.salvar(...)`: aplica a regra de negócio e grava no banco (arquivo *service*).
- `res.status(...).json(...)`: devolve a resposta ao site, com 201 se criou e 200 se editou.

| Arquivo | Tarefa |
|---|---|
| `*.routes.ts` | quais endereços existem e quem pode usar cada um |
| `*.controller.ts` | recebe o pedido, chama a validação e o service, responde |
| `*.schema.ts` | regras de validação dos dados (Zod) |
| `*.service.ts` | regras de negócio e acesso ao banco |
| `*.regras.ts` | cálculos puros, sem banco |

**Por quê:** com a mesma divisão em todo lugar, fica fácil achar as coisas e explicar. Os cálculos importantes ficam em `*.regras.ts`, que não dependem do banco e por isso são testados sozinhos.

---

## Login e segurança

### 6. Como a senha é guardada no banco?

**Resposta:** a senha nunca é guardada. O banco guarda só um *hash*: uma espécie de impressão digital da senha, que não pode ser desfeita.

**Arquivo:** `api/src/utils/senha.ts`, linhas 19 a 23

```ts
export async function gerarHashSenha(senha: string) {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, TAMANHO_HASH);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}
```

**Lendo o trecho:**
- `randomBytes(16)` sorteia um valor aleatório, chamado *sal*.
- `scryptAsync(senha, sal, TAMANHO_HASH)` mistura a senha com o sal e gera o hash.
- A função devolve o texto que vai para o banco: `scrypt:<sal>:<hash>`.
- No login, a senha digitada passa pelo mesmo processo, com o sal guardado, e os dois resultados são comparados (`conferirSenha`, linhas 26 a 35 do mesmo arquivo).

**Por quê:** se o banco vazar, ninguém descobre as senhas. O sal faz duas pessoas com a mesma senha terem hashes diferentes. O scrypt é lento de propósito, o que atrapalha quem tenta adivinhar senhas em massa.

### 7. Como funciona o login?

**Arquivo:** `api/src/modules/auth/auth.service.ts`, linhas 41 a 57

```ts
export async function login(dados: LoginInput) {
  const encontrado = await prisma.usuario.findUnique({
    where: { email: dados.email },
    select: { id: true, ativo: true, senhaHash: true },
  });

  const senhaCorreta = await conferirSenha(dados.senha, encontrado?.senhaHash ?? null);

  // Mensagem única para e-mail inexistente ou senha errada: assim não
  // revelamos se um e-mail está ou não cadastrado na plataforma.
  if (!encontrado || !encontrado.ativo || !senhaCorreta) {
    throw new AppError("E-mail ou senha incorretos.", 401);
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: encontrado.id }, select: camposPublicos });
  return { token: gerarToken(usuario.id, usuario.perfil), usuario };
}
```

**Lendo o trecho:**
- Busca a pessoa no banco pelo e-mail.
- `conferirSenha` compara a senha digitada com o hash guardado.
- Se o e-mail não existe, se a conta está desativada ou se a senha está errada, responde o mesmo erro 401: "E-mail ou senha incorretos."
- Se deu certo, gera o token e devolve junto com os dados públicos da pessoa.

**Por quê:** a mensagem é a mesma para e-mail inexistente e para senha errada, então ninguém consegue descobrir quais e-mails têm conta. `camposPublicos` é a lista de campos que podem sair na resposta, e o hash da senha não está nela.

### 8. O que é o token e por que não dá para falsificar?

**Resposta:** é o crachá que o site recebe no login. Ele leva o id da pessoa, o perfil e a validade, com uma assinatura que só a API sabe fazer.

**Arquivo:** `api/src/utils/token.ts`, linhas 34 a 38 (criar o token)

```ts
export function gerarToken(usuarioId: number, perfil: PerfilUsuario, segredo = env.TOKEN_SECRET, agora = Date.now()) {
  const dados: DadosToken = { usuarioId, perfil, expiraEm: agora + env.TOKEN_HORAS * 60 * 60 * 1000 };
  const dadosCodificados = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return `${dadosCodificados}.${assinar(dadosCodificados, segredo)}`;
}
```

**Arquivo:** `api/src/utils/token.ts`, linhas 45 a 48 (conferir o token)

```ts
  // 1) A assinatura confere?
  const esperada = Buffer.from(assinar(dadosCodificados, segredo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
```

**Lendo o trecho:**
- `dados` junta o id, o perfil e `expiraEm`: o momento atual mais 8 horas.
- Os dados viram texto e recebem uma assinatura (HMAC-SHA256) feita com o `TOKEN_SECRET`, uma chave que só o servidor conhece.
- Quando um token chega, a API calcula de novo a assinatura e compara com a que veio. Se alguém mudou qualquer letra (por exemplo, trocou o perfil para RH), as assinaturas não batem e o token é recusado.

**Por quê:** o servidor não precisa guardar uma lista de sessões; basta conferir a assinatura. É a mesma ideia de um JWT, escrita em poucas linhas para conseguirmos explicar. As 8 horas cobrem um dia de trabalho. `timingSafeEqual` compara sempre no mesmo tempo, para não dar pistas a quem tenta adivinhar a assinatura.

### 9. Como a API sabe quem está fazendo cada pedido?

**Arquivo:** `api/src/middlewares/autenticacao.ts`, linhas 29 a 47

```ts
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  const dados = lerToken(token);

  if (!dados) {
    throw new AppError("Faça login para continuar.", 401);
  }

  // Confere no banco se o usuário ainda existe e está ativo
  // (um usuário desativado perde o acesso mesmo com token válido).
  const usuario = await prisma.usuario.findUnique({
    where: { id: dados.usuarioId },
    select: { id: true, perfil: true, empresaId: true, ativo: true, onboardingConcluido: true },
  });

  if (!usuario?.ativo) {
    throw new AppError("Sua sessão não é mais válida. Faça login novamente.", 401);
  }
```

**Lendo o trecho:**
- Pega o token do cabeçalho `Authorization: Bearer <token>`, que o site envia em todo pedido.
- `lerToken` confere a assinatura e a validade. Sem token válido: erro 401.
- Busca a pessoa no banco e confere se a conta ainda está ativa.
- Logo depois (linhas 49 a 58), guarda quem é a pessoa logada para os próximos passos do pedido.

**Por quê:** é o porteiro de todas as rotas protegidas. Como ele confere o banco a cada pedido, uma conta desativada perde o acesso na hora, mesmo com um token ainda no prazo.

### 10. Um colaborador consegue ver ou alterar os dados de outra pessoa?

**Resposta:** não. O id de quem pede vem sempre do token, nunca do que o site envia. E toda busca no banco filtra pelo dono do registro.

**Arquivo:** `api/src/modules/checkins/checkin.controller.ts`, linha 18

```ts
  const resultado = await checkinService.salvar(usuarioLogado(res).id, dados);
```

**Arquivo:** `api/src/modules/habitos/habito.service.ts`, linhas 64 a 69

```ts
/** Busca um hábito do usuário ou responde 404. */
async function buscarMeta(usuarioId: number, id: number) {
  const meta = await prisma.meta.findFirst({ where: { id, usuarioId, ativa: true }, include: incluir });
  if (!meta) throw new AppError("Hábito não encontrado.", 404);
  return meta;
}
```

**Lendo o trecho:**
- `usuarioLogado(res).id` é o id que o porteiro tirou do token.
- `where: { id, usuarioId, ativa: true }`: só encontra o hábito se ele pertencer àquela pessoa. Se for de outra, responde 404, como se não existisse.

**Por quê:** se o id viesse do pedido, bastaria trocar um número para mexer nos dados de outra pessoa. Responder 404, e não 403, nem confirma que o registro existe. Os testes tentam exatamente isso (até enviando o id da Ana no check-in de outra pessoa) e conferem no banco que nada mudou.

### 11. Como o RH é impedido de ver check-ins individuais?

**Resposta:** as rotas de check-in só aceitam o perfil colaborador, e o RH não tem nenhuma rota que devolva dados de uma pessoa.

**Arquivo:** `api/src/modules/checkins/checkin.routes.ts`, linha 11

```ts
checkinRoutes.use(autenticar, exigirPerfil("COLABORADOR"), exigirOnboarding);
```

**Arquivo:** `api/src/middlewares/autenticacao.ts`, linhas 62 a 69

```ts
export function exigirPerfil(...perfis: PerfilUsuario[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!perfis.includes(usuarioLogado(res).perfil)) {
      throw new AppError("Seu perfil não tem acesso a este recurso.", 403);
    }
    next();
  };
}
```

**Lendo o trecho:**
- A linha 11 põe três porteiros em sequência antes de qualquer rota de check-in: está logado? É colaborador? Concluiu o onboarding?
- `exigirPerfil` compara o perfil de quem pediu com a lista permitida. Fora da lista: erro 403. `next()` deixa o pedido seguir.
- No painel é o contrário: `dashboardRoutes.use(autenticar, exigirPerfil("GESTOR_RH"))`, em `api/src/modules/dashboard/dashboard.routes.ts`, linha 11.

**Por quê:** a permissão fica escrita na própria rota, num lugar visível. Mesmo que alguém altere o site no navegador, a API recusa o pedido.

### 12. Alguém consegue se cadastrar como RH?

**Arquivo:** `api/src/modules/auth/auth.service.ts`, linhas 26 a 36

```ts
  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senhaHash: await gerarHashSenha(dados.senha),
      perfil: "COLABORADOR",
      empresaId: empresa.id,
      onboardingConcluido: false,
    },
    select: camposPublicos,
  });
```

**Lendo o trecho:** ao criar a conta, o perfil é escrito fixo como `"COLABORADOR"` e o onboarding começa pendente (`false`). A senha é gravada como hash (`gerarHashSenha`).

**Por quê:** o cadastro é público. Se o perfil viesse do formulário, qualquer pessoa poderia virar RH e abrir o painel. Contas de RH são criadas pela empresa (no protótipo, pela carga de dados). Um teste envia `perfil: "GESTOR_RH"` no cadastro e confere no banco que a conta foi criada como colaborador.

### 13. E se alguém tentar adivinhar a senha muitas vezes?

**Arquivo:** `api/src/middlewares/limitar-requisicoes.ts`, linhas 28 a 40

```ts
    const ip = req.ip ?? "desconhecido";
    if ((falhas.get(ip)?.quantidade ?? 0) >= maximo) {
      res.setHeader("Retry-After", "60");
      throw new AppError("Muitas tentativas. Aguarde um minuto e tente novamente.", 429);
    }

    // Quando a resposta terminar, conta a tentativa se ela falhou.
    res.on("finish", () => {
      if (res.statusCode < 400) return;
      const contador = falhas.get(ip) ?? { quantidade: 0, expiraEm: Date.now() + UM_MINUTO };
      contador.quantidade += 1;
      falhas.set(ip, contador);
    });
```

**Lendo o trecho:**
- Para cada IP (o endereço de quem acessa), o sistema conta as tentativas que falharam.
- Ao chegar no máximo, responde 429 ("Muitas tentativas") até passar um minuto.
- `res.on("finish", ...)` roda quando a resposta termina, e só conta se ela foi um erro (código 400 ou maior).
- O limite é ligado no login e no cadastro com máximo de 10 (`api/src/modules/auth/auth.routes.ts`, linha 12).

**Por quê:** impede a tentativa e erro em massa. Só as falhas contam porque numa empresa muitas pessoas saem pelo mesmo IP; se os logins certos contassem, colegas se bloqueariam uns aos outros às 9h da manhã.

### 14. Onde ficam a senha do banco e a chave do token?

**Resposta:** fora do código, em variáveis de ambiente: no arquivo `api/.env` no computador e na aba Variables do Railway.

**Arquivo:** `api/src/config/env.ts`, linhas 20 a 29

```ts
    // Chave secreta que assina os tokens de login (veja utils/token.ts).
    TOKEN_SECRET: z.string().min(32, "TOKEN_SECRET precisa ter ao menos 32 caracteres.").default(SEGREDO_DESENVOLVIMENTO),
    // Por quantas horas um login continua válido.
    TOKEN_HORAS: z.coerce.number().int().min(1).max(168).default(8),
  })
  // Em produção é proibido usar o segredo padrão: qualquer um poderia forjar tokens.
  .refine((env) => env.NODE_ENV !== "production" || env.TOKEN_SECRET !== SEGREDO_DESENVOLVIMENTO, {
    path: ["TOKEN_SECRET"],
    message: "Defina um TOKEN_SECRET próprio em produção.",
  });
```

**Lendo o trecho:**
- `TOKEN_SECRET` precisa ter pelo menos 32 caracteres.
- `TOKEN_HORAS` é a validade do login: 8 horas, se nada for configurado.
- A regra `.refine(...)` proíbe usar o segredo padrão de desenvolvimento em produção: nesse caso, a API nem sobe.

**Por quê:** senhas e chaves não podem ir para o GitHub, e o `api/.env` está no `.gitignore`. Se o segredo padrão fosse usado no site público, qualquer pessoa que lesse o código poderia fabricar tokens de RH.

---

## Privacidade do painel do RH

### 15. Como funciona a regra das 5 pessoas?

**Arquivo:** `api/src/modules/dashboard/dashboard.regras.ts`, linhas 9 a 17

```ts
export const LIMIAR_MINIMO = 5;

/** Período máximo que o filtro aceita, para manter a consulta leve. */
export const MAXIMO_DIAS_PERIODO = 90;

/** O grupo é grande o bastante para ser exibido sem risco de identificar alguém? */
export function grupoPodeSerExibido(quantidadeColaboradores: number) {
  return quantidadeColaboradores >= LIMIAR_MINIMO;
}
```

**Arquivo:** `api/src/modules/dashboard/dashboard.service.ts`, linhas 53 a 63

```ts
  // 3) Regra de privacidade: grupo pequeno -> sem números.
  if (!grupoPodeSerExibido(colaboradores)) {
    return {
      ...base,
      privacidade: {
        dadosDisponiveis: false,
        limiarMinimo: LIMIAR_MINIMO,
        mensagem: `São necessários ao menos ${LIMIAR_MINIMO} colaboradores no recorte para exibir dados agregados.`,
      },
    };
  }
```

**Lendo o trecho:**
- `LIMIAR_MINIMO = 5` é o número mínimo de pessoas num grupo.
- `grupoPodeSerExibido` responde "sim" quando o grupo tem 5 ou mais.
- No painel, se o grupo filtrado for menor, a resposta não leva nenhum número, só a mensagem explicando por quê.

**Por quê:** num grupo de 2 pessoas, a média praticamente revela a resposta de cada uma. Com 5 ou mais, não dá para saber quem respondeu o quê. A regra vale também quando o RH filtra por setor.

### 16. Por que o setor Financeiro não aparece no filtro?

**Arquivo:** `api/src/modules/dashboard/dashboard.regras.ts`, linhas 29 a 35

```ts
/** Só oferece no filtro os setores que têm gente suficiente para respeitar o limiar. */
export function setoresExibiveis(contagemPorSetor: Array<{ setor: string | null; quantidade: number }>) {
  return contagemPorSetor
    .filter((item): item is { setor: string; quantidade: number } => !!item.setor && grupoPodeSerExibido(item.quantidade))
    .map((item) => item.setor)
    .sort((a, b) => a.localeCompare(b));
}
```

**Lendo o trecho:** recebe quantas pessoas cada setor tem. O `filter` mantém só os setores com 5 ou mais (usando a mesma regra da pergunta anterior), o `map` pega só o nome e o `sort` coloca em ordem alfabética.

**Por quê:** nos dados de demonstração, Financeiro tem 1 pessoa. Nem oferecer a opção evita que o RH tente olhar um grupo pequeno. Hoje só Tecnologia, com 6 pessoas, aparece no filtro.

### 17. O painel mostra nomes ou respostas de alguém?

**Resposta:** não. A consulta busca só números, e a resposta leva só médias e contagens.

**Arquivo:** `api/src/modules/dashboard/dashboard.service.ts`, linhas 26 a 34

```ts
  // 2) Quem forma o grupo: colaboradores ativos da empresa que já concluíram o
  //    onboarding (só eles podem fazer check-in), filtrados por setor se pedido.
  const grupo = {
    empresaId: gestor.empresaId,
    perfil: "COLABORADOR" as const,
    ativo: true,
    onboardingConcluido: true,
    ...(filtros.setor ? { setor: filtros.setor } : {}),
  };
```

**Arquivo:** `api/src/modules/dashboard/dashboard.service.ts`, linhas 65 a 69

```ts
  // 4) Check-ins do grupo no período (só os campos numéricos necessários).
  const checkins = await prisma.checkin.findMany({
    where: { data: { gte: inicio, lte: fim }, usuario: grupo },
    select: { data: true, usuarioId: true, humor: true, energia: true, sono: true, estresse: true },
  });
```

**Lendo o trecho:**
- `grupo` define quem entra na conta: colaboradores ativos da empresa do gestor que já concluíram o onboarding, e só do setor escolhido, se houver filtro.
- `empresaId: gestor.empresaId` vem do token: o RH só vê a própria empresa.
- No `select`, a consulta pede só a data, o id e as quatro notas. A observação escrita nunca é lida.
- O id serve apenas para contar quantas pessoas participaram (linha 71) e não sai na resposta.

**Por quê:** o RH precisa de tendências, não de pessoas. Um teste automático lê a resposta inteira do painel e confere que não aparece `usuarioId`, `email`, o nome "Ana Souza" nem `observacao` (pergunta 36).

---

## Regras do colaborador

### 18. Como o sistema garante um check-in por dia?

**Arquivo:** `api/prisma/schema.prisma`, linha 112

```prisma
  @@unique([usuarioId, data])
```

**Arquivo:** `api/src/modules/checkins/checkin.service.ts`, linhas 83 a 88

```ts
    const checkin = await tx.checkin.upsert({
      where: { usuarioId_data: { usuarioId, data: hoje } },
      update: valores,
      create: { usuarioId, data: hoje, ...valores },
      select: camposCheckin,
    });
```

**Lendo o trecho:**
- No banco, `@@unique([usuarioId, data])` proíbe duas linhas com a mesma pessoa e o mesmo dia.
- `upsert` quer dizer "atualiza se já existe, cria se não existe": o segundo envio do dia edita o check-in em vez de criar outro.

**Por quê:** a regra fica protegida em dois níveis. Mesmo que o código tivesse um erro, o banco recusaria a duplicata.

### 19. Como funcionam os pontos? Por que editar o check-in não dá pontos de novo?

**Arquivo:** `api/src/modules/gamificacao/gamificacao.regras.ts`, linhas 9 a 14

```ts
export const PONTOS = {
  /** Primeiro check-in do dia (editar o check-in não dá pontos de novo). */
  CHECKIN: 10,
  /** Hábito concluído no dia de hoje. */
  HABITO_CONCLUIDO: 2,
} as const;
```

**Arquivo:** `api/src/modules/checkins/checkin.service.ts`, linhas 90 a 95

```ts
    if (existente) {
      return { checkin, criado: false, pontosGanhos: 0, medalhasNovas: [], mensagem: "Check-in de hoje atualizado." };
    }

    // Primeiro check-in do dia: pontos e medalhas.
    await adicionarPontos(tx, usuarioId, PONTOS.CHECKIN);
```

**Lendo o trecho:**
- `PONTOS` reúne os valores: 10 pelo check-in do dia e 2 por hábito concluído.
- `existente` indica se já havia check-in hoje. Se havia, a função termina ali (`return`) com 0 pontos.
- Só o primeiro check-in do dia chega a `adicionarPontos(..., PONTOS.CHECKIN)`.

**Por quê:** sem essa regra, alguém salvaria o check-in 50 vezes e ganharia 500 pontos. Com os valores num lugar só, mudar a pontuação é trocar um número.

### 20. Como é calculada a sequência de dias seguidos?

**Arquivo:** `api/src/modules/checkins/checkin.regras.ts`, linhas 13 a 24

```ts
export function calcularSequencia(datas: Date[], hoje: Date) {
  const dias = new Set(datas.map(chaveData));

  let cursor = dias.has(chaveData(hoje)) ? hoje : adicionarDias(hoje, -1);
  let sequencia = 0;

  while (dias.has(chaveData(cursor))) {
    sequencia += 1;
    cursor = adicionarDias(cursor, -1);
  }
  return sequencia;
}
```

**Lendo o trecho:**
- `dias` é a lista de dias que têm check-in.
- O `cursor` começa hoje; se hoje ainda não tem check-in, começa ontem.
- O `while` ("enquanto") volta um dia de cada vez e soma 1 enquanto encontrar check-in. Na primeira falta, para.

**Por quê:** se a pessoa ainda não fez o check-in de hoje, a sequência não pode zerar de manhã, porque o dia ainda não acabou. A função não usa o banco, então é testada sozinha em `api/tests/regras.test.ts`.

### 21. Como as medalhas são ganhas? E por que não dá para ganhar a mesma duas vezes?

**Arquivo:** `api/src/modules/gamificacao/gamificacao.service.ts`, linhas 26 a 43

```ts
export async function concederMedalha(tx: Transacao, usuarioId: number, chave: ChaveMedalha) {
  const dados = MEDALHAS[chave];

  // Cria a medalha no catálogo caso o seed ainda não tenha criado.
  const medalha = await tx.medalha.upsert({
    where: { nome: dados.nome },
    update: {},
    create: dados,
  });

  const jaTem = await tx.conquistaMedalha.findUnique({
    where: { usuarioId_medalhaId: { usuarioId, medalhaId: medalha.id } },
  });
  if (jaTem) return false;

  await tx.conquistaMedalha.create({ data: { usuarioId, medalhaId: medalha.id } });
  return true;
}
```

**Lendo o trecho:**
- Garante que a medalha existe no catálogo (`upsert`).
- `jaTem` procura se a pessoa já conquistou essa medalha. Se sim, devolve `false` e não faz mais nada.
- Se não, grava a conquista e devolve `true`, para a tela avisar "Nova medalha".
- Cada módulo decide quando chamar: "Primeiro passo" no primeiro check-in, "Consistência" com 7 dias seguidos e "Desafiante" ao concluir um desafio.

**Por quê:** a conferência evita medalha repetida, e o banco também impede: a chave da tabela `ConquistaMedalha` é a dupla pessoa + medalha (`api/prisma/schema.prisma`, linha 254).

### 22. Por que concluir um hábito e depois desmarcar tira os pontos?

**Arquivo:** `api/src/modules/habitos/habito.service.ts`, linhas 331 a 334

```ts
      // Pontos: só para o dia de hoje e só quando a situação "concluído" muda.
      if (chaveData(dia) === chaveData(hoje) && atual.concluido !== novo.concluido) {
        await adicionarPontos(tx, usuarioId, novo.concluido ? PONTOS.HABITO_CONCLUIDO : -PONTOS.HABITO_CONCLUIDO);
      }
```

**Lendo o trecho:**
- Só entra no `if` quando o registro é de hoje **e** a situação "concluído" mudou.
- Se passou a concluído: +2 pontos. Se deixou de ser: −2 pontos.

**Por quê:** sem isso, marcar e desmarcar o mesmo hábito daria pontos sem fim. Registrar dias passados também não dá pontos, para ninguém preencher a semana inteira de uma vez só para pontuar.

### 23. Como funciona um desafio?

**Arquivo:** `api/src/modules/desafios/desafio.regras.ts`, linhas 23 a 36

```ts
export function motivoParaNaoRegistrar(desafio: DesafioRegra, participacao: ParticipacaoRegra, hoje: Date) {
  if (!desafioAberto(desafio, hoje)) return "Este desafio não está aberto hoje.";
  if (participacao.concluido) return "Você já concluiu este desafio.";
  if (participacao.ultimoRegistro && chaveData(participacao.ultimoRegistro) === chaveData(hoje)) {
    return "Você já registrou este desafio hoje. Volte amanhã!";
  }
  return null;
}

/** Novo progresso após um registro e se, com ele, a meta foi atingida. */
export function aplicarRegistro(progressoAtual: number, metaRegistros: number) {
  const progresso = Math.min(progressoAtual + 1, metaRegistros);
  return { progresso, concluido: progresso >= metaRegistros };
}
```

**Lendo o trecho:**
- O RH cria o desafio com período, meta de registros e pontos de recompensa. O colaborador entra e clica em "Fiz hoje".
- `motivoParaNaoRegistrar` devolve o motivo do bloqueio, ou `null` se pode registrar. Para registrar, o desafio precisa estar aberto, a pessoa não pode tê-lo concluído e não pode ter registrado hoje.
- `aplicarRegistro` soma 1 ao progresso, sem passar da meta (`Math.min`), e diz se a meta foi atingida.
- Ao atingir a meta, a pessoa ganha os pontos de recompensa e a medalha "Desafiante".

**Por quê:** "um registro por dia" impede completar um desafio de 5 dias com 5 cliques. As regras ficam separadas do banco e são testadas sozinhas.

### 24. O que é uma transação e por que vocês usam?

**Resposta:** é um pacote de gravações no banco que acontece inteiro ou não acontece.

**Arquivo:** `api/src/modules/checkins/checkin.service.ts`, linhas 76 a 77

```ts
  // Tudo dentro de uma transação: check-in, pontos e medalhas são gravados juntos.
  return prisma.$transaction(async (tx) => {
```

**Arquivo:** `api/src/modules/desafios/desafio.service.ts`, linhas 176 a 177

```ts
    // Serializable: dois cliques simultâneos não conseguem registrar duas vezes no mesmo dia.
  }, { isolationLevel: "Serializable" });
```

**Lendo o trecho:**
- Tudo que está dentro de `prisma.$transaction` usa o mesmo `tx`. Se qualquer passo falhar, o banco desfaz os anteriores.
- `Serializable` é o modo mais rígido: se dois pedidos iguais chegam ao mesmo tempo, o banco trata um depois do outro.

**Por quê:** sem transação, o check-in poderia ser salvo sem os pontos, ou o contrário. No desafio, dois cliques muito rápidos poderiam registrar duas vezes no mesmo dia.

### 25. Como os lembretes aparecem, se o sistema não tem notificação push?

**Arquivo:** `web/src/components/layout/AvisoLembretes.tsx`, linha 12

```ts
const INTERVALO = 30_000;
```

**Arquivo:** `web/src/components/layout/AvisoLembretes.tsx`, linhas 36 a 37

```ts
    void verificar();
    const intervalo = window.setInterval(verificar, INTERVALO);
```

**Arquivo:** `api/src/modules/lembretes/lembrete.regras.ts`, linhas 22 a 30

```ts
export function deveAparecer(lembrete: LembreteRegra, momento: Momento) {
  if (!lembrete.ativo) return false;

  // Adiado: aparece assim que o horário do adiamento chegar.
  if (lembrete.adiadoAte) return momento.agora >= lembrete.adiadoAte;

  const diaEscolhido = lembrete.diasSemana.length === 0 || lembrete.diasSemana.includes(momento.diaSemana);
  return diaEscolhido && lembrete.horario === momento.horario;
}
```

**Lendo o trecho:**
- No site, `setInterval(verificar, INTERVALO)` repete a pergunta "tem lembrete agora?" a cada 30 segundos (30.000 milissegundos), enquanto a página está aberta.
- Na API, `deveAparecer` decide: o lembrete está ativo? Se foi adiado, o novo horário já chegou? Se não foi, hoje é um dos dias escolhidos e o relógio marca o horário dele?
- O lembrete de check-in não aparece se a pessoa já fez o check-in, e nenhum aparece se ela desligou as notificações no perfil.

**Por quê:** o grupo decidiu não usar push, por ser um site. Consultar a cada 30 segundos garante que cada minuto é verificado pelo menos uma vez, sem depender de serviço externo.

### 26. Por que o código se preocupa com fuso horário?

**Arquivo:** `api/src/utils/data.ts`, linhas 8 a 20

```ts
const FUSO_HORARIO = "America/Sao_Paulo";

/** Dia atual (ou da data informada) no calendário de São Paulo. */
export function dataLocal(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return new Date(`${valor.year}-${valor.month}-${valor.day}T00:00:00.000Z`);
}
```

**Lendo o trecho:**
- `FUSO_HORARIO` fixa o horário de São Paulo.
- `dataLocal` descobre que dia é hoje no calendário de São Paulo e devolve esse dia, sem a hora.

**Por quê:** o servidor do Railway usa o horário UTC, 3 horas à frente de Brasília. Sem isso, um check-in às 22h de segunda contaria como terça. Todas as regras de "hoje" usam esta função.

---

## Validação e erros

### 27. Como o sistema recusa dados errados, como um humor 9?

**Arquivo:** `api/src/modules/checkins/checkin.schema.ts`, linhas 9 a 17

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

**Lendo o trecho:**
- `escala`: número inteiro de 1 a 5.
- Humor e energia são obrigatórios. Sono e estresse podem vir vazios (`nullable().optional()`), por isso aparecem como opcionais na tela.
- A observação tem no máximo 500 caracteres, e os espaços nas pontas são removidos (`trim`).
- Não existe campo de usuário: se alguém enviar `usuarioId`, ele é ignorado.

**Por quê:** a tela já limita os valores, mas qualquer pessoa pode enviar pedidos direto à API, sem usar a tela. Por isso a validação é feita no servidor, com a biblioteca Zod.

### 28. O que acontece quando algo dá errado?

**Arquivo:** `api/src/middlewares/error-handler.ts`, linhas 18 a 27

```ts
  if (erro instanceof ZodError) {
    res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: erro.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensagem: issue.message,
      })),
    });
    return;
  }
```

**Arquivo:** `api/src/middlewares/error-handler.ts`, linhas 39 a 45

```ts
  if (erro instanceof AppError) {
    res.status(erro.statusCode).json({ erro: erro.message });
    return;
  }

  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
```

**Lendo o trecho:**
- Erro de validação (Zod): responde 400 com a lista dos campos errados e a mensagem de cada um.
- Erro de regra de negócio (`AppError`): responde com o código e a mensagem da regra, como 409 "Você já participa deste desafio."
- Qualquer outro erro: grava os detalhes no registro (log) do servidor e responde só "Erro interno do servidor."

**Por quê:** um lugar só trata todos os erros, então as respostas têm sempre o mesmo formato e o site sabe mostrar a mensagem. Detalhes técnicos não aparecem para o usuário, porque poderiam ajudar alguém mal-intencionado.

---

## Banco de dados

### 29. Onde estão as tabelas do banco?

**Arquivo:** `api/prisma/schema.prisma`, linhas 98 a 114

```prisma
model Checkin {
  id           Int      @id @default(autoincrement())
  usuarioId    Int
  data         DateTime @db.Date
  humor        Int
  energia      Int
  sono         Int?
  estresse     Int?
  observacao   String?
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, data])
  @@index([data])
}
```

**Lendo o trecho:**
- `model Checkin` vira a tabela `Checkin`. Cada linha de dentro é uma coluna, com nome, tipo e regras.
- `Int` é número inteiro; `Int?` (com interrogação) pode ficar vazio, como sono e estresse; `@db.Date` guarda só o dia, sem a hora.
- `@relation(...)` liga cada check-in à pessoa dona dele. Com `onDelete: Cascade`, se a pessoa for apagada, os check-ins dela também são.
- `@@unique` impede dois check-ins da mesma pessoa no mesmo dia; `@@index` deixa as buscas por data mais rápidas.

**Por quê:** o `schema.prisma` descreve as 13 tabelas num formato fácil de ler, e o Prisma gera a partir dele o código que a API usa para consultar o banco. As tabelas `Relatorio` e `AlertaEngajamento` já existem para os UC12 e UC13, que ficaram para depois.

### 30. Como a API se conecta ao banco?

**Arquivo:** `api/src/database/prisma.ts`, linhas 11 a 13

```ts
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
```

**Lendo o trecho:** o endereço do banco (`DATABASE_URL`) vem da configuração. É criado um único cliente `prisma`, que todos os módulos importam.

**Por quê:** uma conexão compartilhada é mais leve do que abrir uma a cada pedido. Com o Prisma, ninguém escreve SQL à mão nas rotas, o que evita erros e ataques de injeção de SQL.

### 31. Como o banco é criado e atualizado?

**Resposta:** por migrações: arquivos SQL numerados que o Prisma aplica em ordem. Ficam em `api/prisma/migrations/` (são 9).

**Arquivo:** `api/prisma/migrations/20261120172256_desafios_meta_registros/migration.sql`, linhas 1 a 5

```sql
-- AlterTable
ALTER TABLE "Desafio" ADD COLUMN     "metaRegistros" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "ParticipacaoDesafio" ADD COLUMN     "ultimoRegistro" DATE;
```

**Arquivo:** `api/package.json`, linha 19

```json
    "start:producao": "prisma migrate deploy && tsx prisma/seed.ts && node dist/server.js"
```

**Lendo o trecho:**
- Esta migração adicionou duas colunas: a meta de registros do desafio (5, se nada for informado) e o dia do último registro de cada participante.
- Ao iniciar no Railway, o `start:producao` faz três coisas em ordem: aplica as migrações que faltam, roda a carga de dados de demonstração e sobe o servidor.

**Por quê:** cada mudança no banco fica registrada e numerada, como um histórico. Qualquer computador, ou o Railway, chega exatamente na mesma estrutura rodando as migrações.

### 32. De onde vêm os dados de demonstração? E por que rodar de novo não duplica nada?

**Arquivo:** `api/prisma/seed.ts`, linhas 15 a 20

```ts
export const SENHA_DEMO = "12345678";

/** Colaboradores fictícios. Tecnologia tem 6 pessoas para demonstrar o filtro por setor. */
const COLABORADORES = [
  { nome: "Ana Souza", email: "user@ifsp.com", setor: "Tecnologia" },
  { nome: "Bruno Lima", email: "bruno.lima@workwell.local", setor: "Tecnologia" },
```

**Arquivo:** `api/prisma/seed.ts`, linhas 64 a 65

```ts
    const usuario = await prisma.usuario.upsert({
      where: { email: colaborador.email },
```

**Arquivo:** `api/prisma/seed.ts`, linhas 100 a 103

```ts
  for (const [indice, colaborador] of colaboradores.entries()) {
    for (let deslocamento = -6; deslocamento <= 0; deslocamento += 1) {
      // Ana (índice 0) fica sem o check-in de hoje para a demonstração.
      if (indice === 0 && deslocamento === 0) continue;
```

**Lendo o trecho:**
- O `seed.ts` cria a empresa, 10 colaboradores fictícios (6 em Tecnologia), a gestora de RH, check-ins dos últimos 7 dias, lembretes e o desafio "Semana da hidratação", todos com a senha `12345678`.
- `upsert` procura pelo e-mail: se a pessoa já existe, atualiza; se não existe, cria. Por isso rodar várias vezes não duplica.
- Os dois `for` repetem os passos para cada colaborador e para cada um dos últimos 7 dias. A Ana, primeira da lista, pula o dia de hoje: assim o check-in dela está pendente na apresentação.

**Por quê:** a demonstração precisa de dados realistas sem usar dados de pessoas reais. Como a carga pode ser repetida, ela roda a cada início do servidor no Railway sem estragar nada.

---

## Site

### 33. Como o site decide qual tela mostrar?

**Arquivo:** `web/src/App.tsx`, linhas 40 a 55

```tsx
  if (!usuario) {
    return <AcessoPage />;
  }

  if (usuario.perfil === "COLABORADOR" && !usuario.onboardingConcluido) {
    return <OnboardingPage />;
  }

  const paginaInicial: Pagina = usuario.perfil === "GESTOR_RH" ? "painel" : "inicio";
  const setPagina = (pagina: Pagina) => setNavegacao({ usuarioId: usuario.id, pagina });

  // Página atual: a escolhida por este usuário, ou a inicial do perfil.
  // Também garante que cada perfil só veja as próprias páginas.
  let paginaAtual = navegacao.usuarioId === usuario.id ? navegacao.pagina : paginaInicial;
  if (usuario.perfil === "GESTOR_RH" && !PAGINAS_RH.includes(paginaAtual)) paginaAtual = "painel";
  if (usuario.perfil === "COLABORADOR" && paginaAtual === "painel") paginaAtual = "inicio";
```

**Lendo o trecho:**
- Ninguém logado: mostra a tela de acesso (login e cadastro).
- Colaborador que ainda não fez o onboarding: mostra o onboarding.
- Depois, a página inicial depende do perfil: o painel para o RH, o início (check-in) para o colaborador.
- As duas últimas linhas impedem que o RH abra páginas de colaborador e vice-versa.

**Por quê:** a navegação é só uma variável com o nome da página, sem biblioteca de rotas, para ficar fácil de entender. A proteção de verdade continua na API: mesmo que alguém forçasse uma tela, a API recusaria os dados.

### 34. Como o site lembra que estou logado e envia o token?

**Arquivo:** `web/src/services/api.ts`, linhas 74 a 92

```ts
export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as CorpoErro;
    // 401 com token = sessão vencida. Sem token é só um login errado.
    if (resposta.status === 401 && token) {
      definirToken(null);
      aoExpirarSessao();
    }
    throw new ApiRequestError(corpo.erro ?? "Não foi possível concluir a operação.", resposta.status, corpo.detalhes);
  }
```

**Lendo o trecho:**
- Toda chamada do site à API passa por esta função. `fetch` é o comando do navegador que faz o pedido.
- Se existe token, ele vai no cabeçalho `Authorization: Bearer <token>`.
- Se a resposta for um erro, a mensagem da API é repassada para a tela mostrar.
- Se a resposta for 401 com token, a sessão venceu: o token é apagado e o site volta para o login.
- O token fica guardado no `localStorage` do navegador (`definirToken`, linhas 47 a 55), por isso o login continua depois de apertar F5.

**Por quê:** num lugar só, nenhuma tela precisa lembrar de enviar o token. E o site volta sozinho ao login quando as 8 horas passam.

### 35. O que acontece, do clique até o banco, quando faço o check-in?

**Arquivo:** `web/src/pages/colaborador/InicioPage.tsx`, linhas 33 a 43

```tsx
  async function salvar(dados: DadosCheckin) {
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      const resposta = await salvarCheckin(dados);
      const medalhas = resposta.medalhasNovas.length ? ` Nova medalha: ${resposta.medalhasNovas.join(", ")}!` : "";
      setMensagem(resposta.mensagem + medalhas);
      setEditando(false);
      recarregar(); // atualiza sequência, médias e histórico
      await atualizarUsuario(); // atualiza os pontos exibidos no topo
```

**Arquivo:** `web/src/services/workwell.ts`, linha 44

```ts
export const salvarCheckin = (dados: DadosCheckin) => enviar<RespostaCheckin>("/checkins", "POST", dados);
```

**Lendo o trecho (o caminho completo):**
1. Ao clicar em "Concluir check-in", o formulário chama `salvar(dados)` com as notas escolhidas.
2. `salvarCheckin` envia `POST /api/checkins` com os dados, passando por `api.ts`, que coloca o token (pergunta 34).
3. Na API, o porteiro confere o token e o perfil (perguntas 9 e 11), o schema valida as notas (pergunta 27) e o service grava o check-in, os pontos e as medalhas numa transação (perguntas 18, 19 e 24).
4. A resposta volta com a mensagem e as medalhas novas. A tela mostra a mensagem, recarrega o resumo (sequência, médias e gráfico) e atualiza os pontos no topo.

**Por quê:** cada camada faz uma coisa só, então dá para seguir o caminho arquivo por arquivo.

---

## Testes e hospedagem

### 36. Como vocês garantem que o sistema funciona?

**Arquivo:** `api/tests/regras.test.ts`, linhas 71 a 75

```ts
describe("painel do RH: privacidade", () => {
  test("só exibe grupos com 5 ou mais colaboradores", () => {
    assert.equal(grupoPodeSerExibido(4), false);
    assert.equal(grupoPodeSerExibido(5), true);
  });
```

**Arquivo:** `api/tests/api.integracao.test.ts`, linhas 154 a 163

```ts
  test("painel do RH traz só dados agregados", async () => {
    const token = await login("rh@ifsp.com");
    const { status, corpo } = await chamar("/dashboard", { token });
    assert.equal(status, 200);
    assert.equal(corpo["privacidade"].dadosDisponiveis, true);
    const texto = JSON.stringify(corpo);
    for (const proibido of ["usuarioId", "email", "Ana Souza", "observacao"]) {
      assert.equal(texto.includes(proibido), false, `o painel não deve conter "${proibido}"`);
    }
  });
```

**Lendo o trecho:**
- `assert.equal(a, b)` quer dizer "confira se `a` é igual a `b`; se não for, o teste falha".
- O primeiro teste confere a regra das 5 pessoas sozinha: com 4 não exibe, com 5 exibe.
- O segundo sobe a API de verdade, entra como RH, pede o painel e confere que a resposta não contém nenhum dado pessoal.
- São 53 testes: 20 das regras e 33 de integração, que fazem as ações como um usuário e depois conferem no banco o que foi gravado. Rodam com `npm test` e `npm run test:integracao`, na pasta `api`.

**Por quê:** testar tudo à mão a cada mudança é lento e fácil de esquecer. Os testes de integração acharam erros reais, que corrigimos antes da entrega.

### 37. Como o site foi colocado no ar?

**Arquivo:** `railway.json`, linhas 1 a 14

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Lendo o trecho:**
- `buildCommand`: o Railway roda `npm run build`, que instala as bibliotecas e compila o site e a API (`package.json` da raiz, linha 9).
- `startCommand`: `npm start` roda o `start:producao` da API: migrações, carga de dados e servidor (pergunta 31).
- `healthcheckPath`: o Railway acessa `/api/health` para saber se o servidor está de pé; essa rota também confere a conexão com o banco.
- `restartPolicyType`: se o servidor cair, o Railway tenta reiniciar até 3 vezes.
- Cada envio de código para a branch `main` no GitHub dispara um novo deploy automático.

**Por quê:** o Railway hospeda o programa e o PostgreSQL juntos, com um endereço público (`workwellifsp.up.railway.app`). Isso basta para a apresentação e para várias pessoas testarem ao mesmo tempo.
