# Arquitetura do WorkWell

O objetivo é uma arquitetura **simples de explicar**: poucas camadas, sempre na mesma ordem, e cada arquivo com uma única responsabilidade.

```
Navegador (React)  ──HTTP/JSON──▶  API (Express)  ──Prisma──▶  PostgreSQL
   web/                                 api/
```

## Backend (`api/`)

```
api/
├── prisma/
│   ├── schema.prisma        modelo do banco (tabelas e relações)
│   ├── migrations/          histórico de alterações do banco (SQL)
│   ├── seed.ts              dados fictícios
│   └── reset-demo.ts        restaura a demonstração
├── src/
│   ├── server.ts            abre a porta HTTP
│   ├── app.ts               monta o Express (CORS, JSON, rotas, erros)
│   ├── config/env.ts        lê e valida o .env
│   ├── database/prisma.ts   conexão única com o banco
│   ├── errors/AppError.ts   erro de regra de negócio (mensagem + código HTTP)
│   ├── middlewares/
│   │   ├── autenticacao.ts        autenticar / exigirPerfil / exigirOnboarding
│   │   ├── limitar-requisicoes.ts bloqueio após muitas tentativas com erro
│   │   └── error-handler.ts       transforma erros em respostas JSON
│   ├── utils/               datas, senhas, tokens, médias, validações comuns
│   ├── routes/index.ts      mapa: caminho -> módulo
│   └── modules/             uma pasta por assunto (veja abaixo)
└── tests/                   testes de unidade e de integração
```

### Os módulos

Cada pasta em `src/modules` é um assunto do sistema e segue **sempre** a mesma estrutura:

| Arquivo | Responsabilidade | Pergunta que responde |
|---|---|---|
| `*.routes.ts` | URLs e permissões | Quem pode chamar o quê? |
| `*.controller.ts` | Lê a requisição, valida e responde | O que chegou e o que devolvo? |
| `*.schema.ts` | Validação com Zod | Os dados são válidos? |
| `*.service.ts` | Regras de negócio + banco | O que o sistema faz? |
| `*.regras.ts` | Cálculos puros, sem banco | Como se calcula? (fácil de testar) |

Módulos: `auth`, `usuarios`, `checkins`, `habitos`, `lembretes`, `desafios`, `gamificacao`, `dashboard`, `health`.

### Caminho de uma requisição (exemplo: salvar check-in)

1. `POST /api/checkins` chega ao Express (`app.ts`).
2. `routes/index.ts` envia para `checkin.routes.ts`.
3. Os middlewares rodam em ordem: `autenticar` (lê o token), `exigirPerfil("COLABORADOR")` e `exigirOnboarding`.
4. `checkin.controller.ts` valida o corpo com `salvarCheckinSchema` e pega o id do usuário **do token**.
5. `checkin.service.ts` grava o check-in numa transação, junto com pontos e medalhas (`gamificacao.service.ts`).
6. A resposta JSON volta ao navegador. Se algo falhar, `error-handler.ts` monta a mensagem de erro.

### Decisões importantes

- **Id do usuário só pelo token.** Nenhuma rota recebe `usuarioId` na URL ou no corpo, então ninguém acessa dados de outra pessoa trocando um número.
- **Privacidade no RH.** O painel só devolve agregados, e só para grupos com ao menos 5 pessoas (`dashboard.regras.ts`). Os desafios mostram ao RH contagens, nunca nomes.
- **Transações.** Operações que mexem em várias tabelas (check-in + pontos + medalha) acontecem juntas ou não acontecem.
- **Token próprio em vez de biblioteca.** `utils/token.ts` implementa em poucas linhas a mesma ideia do JWT (dados + assinatura HMAC), para o grupo conseguir explicar cada passo.
- **PostgreSQL em vez de MySQL.** O ambiente já usava PostgreSQL. O DER e os conceitos relacionais não mudam.

## Frontend (`web/src`)

```
web/src/
├── main.tsx                 monta o React com o SessaoProvider
├── App.tsx                  escolhe a tela: login, onboarding ou páginas do perfil
├── context/                 sessão (usuário logado, entrar, sair)
├── hooks/                   useSessao, useCarregar, useHabitos, useLembretesHabitos
├── services/
│   ├── api.ts               fetch + token + tratamento de erros
│   ├── workwell.ts          uma função por rota da API
│   └── habitos-*.ts         API e regras de formulário dos hábitos
├── pages/
│   ├── acesso/              AcessoPage (login/cadastro), OnboardingPage
│   ├── colaborador/         InicioPage (check-in), ProgressoPage, HabitosPage, LembretesPage, DesafiosPage, PerfilPage
│   └── rh/                  PainelRhPage, DesafiosRhPage
├── components/
│   ├── layout/              AppLayout (menu, topo), ColaboradorNav (menu do celular), AvisoLembretes
│   ├── checkin/             formulário, resumo do dia, cartões, histórico e gráfico do check-in
│   ├── habitos/             componentes da tela de hábitos
│   └── ui/                  peças reaproveitáveis (Escala, ProgressBar)
├── types/                   tipos das respostas da API
├── utils/                   formatação de datas
└── styles/                  CSS (tokens de cor, layout, telas)
```

Regra prática: **páginas** juntam dados e componentes; **componentes** só exibem e avisam ações; **services** são os únicos que falam com a API.

## Testes

- `api/tests/regras.test.ts`: regras puras (senha, token, sequência, privacidade, desafios, hábitos). Rodam sem banco.
- `api/tests/api.integracao.test.ts`: sobe a API e testa os fluxos críticos e as permissões.
- `api/tests/sistema.integracao.test.ts`: percorre todas as rotas de docs/API.md e, após cada ação, confere no banco o que foi gravado (pontos, medalhas, registros, adiamentos, números do painel).

## Diferenças em relação ao relatório científico

Comparação feita figura por figura (DER, classes, casos de uso, UC04 expandido, sequência e atividade do check-in). O texto do relatório deve ser atualizado nestes pontos:

| Relatório | Implementação | Motivo |
|---|---|---|
| SGBD MySQL (seção 3.1) | PostgreSQL | Ambiente já configurado; DER e conceitos relacionais não mudam |
| DER: ALERTA_ENGAJAMENTO referencia o colaborador inativo | O alerta guarda só empresa/setor, período e números agregados | Privacidade (LGPD): o RH não pode saber quem deixou de fazer check-in |
| Classe Desafio sem meta | Campo `metaRegistros` (dias para concluir) e `ultimoRegistro` na participação | Necessário para saber quando o desafio termina e limitar 1 registro por dia |
| Lembrete com `adiar(minutos)` | Campo `adiadoAte` no Lembrete | Guarda até quando o lembrete fica adiado |
| UC04 E1 / atividade: armazenamento local e sincronização sem rede | Não implementado | Fora do escopo: é um site, usado com conexão |
| Ator "Sistema de Notificação" (push) | Avisos dentro da página (`AvisoLembretes`) | Fora do escopo: é um site |
| `Desafio.calcularRanking()` | Não implementado | Fora do escopo; um ranking com nomes também conflitaria com a privacidade |
| RNF: check-in em "no máximo 3 interações" | Uma tela com 4 escalas e 1 confirmação (sono e estresse podem ser pulados) | O próprio fluxo do UC04 tem mais de 3 passos; a meta mensurável mantida é concluir em menos de 2 minutos |
| UC12 e UC13 | Não implementados nesta etapa | Decisão do grupo |
