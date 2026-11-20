# API do WorkWell

Base: `http://localhost:3333/api`. Corpo e respostas em JSON.

**Autenticação:** as rotas marcadas com 🔒 exigem o cabeçalho `Authorization: Bearer <token>`. O token vem do login ou do cadastro e vale 8 horas.

**Erros** seguem sempre o formato `{ "erro": "mensagem" }`. Em dados inválidos (400), há também `detalhes: [{ campo, mensagem }]`.

| Código | Significado |
|---|---|
| 400 | Dados inválidos ou regra de negócio não atendida |
| 401 | Sem login, ou token inválido/expirado |
| 403 | Perfil sem permissão (ou onboarding pendente) |
| 404 | Não encontrado |
| 409 | Conflito (e-mail repetido, já registrado hoje...) |
| 413 | Corpo da requisição grande demais (limite de 100 KB) |
| 429 | Muitas tentativas de login com erro |

## Sistema

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `/health` | público | API e banco no ar |

## Autenticação (UC01, UC02)

| Método | Rota | Quem | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/auth/cadastro` | público | `{ nome, email, senha }` (senha ≥ 8) | `201 { token, usuario }` |
| POST | `/auth/login` | público | `{ email, senha }` | `{ token, usuario }` |

O cadastro sempre cria um **colaborador** com `onboardingConcluido: false`.

## Usuário e onboarding (UC01, UC03) 🔒

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `/usuarios/me` | todos | perfil do usuário logado |
| PUT | `/usuarios/me` | colaborador | `{ nome, cargo, setor, prefNotificacao }` |
| GET | `/usuarios/onboarding/opcoes` | todos | setores e hábitos sugeridos |
| POST | `/usuarios/me/onboarding` | colaborador | perfil + `habitosIniciais: ["water", ...]` |

## Check-in (UC04, UC07) 🔒 colaborador com onboarding

| Método | Rota | Descrição |
|---|---|---|
| GET | `/checkins/resumo?dias=7` ou `?dias=30` | check-in de hoje, histórico e médias da semana (7) ou do mês (30), sequência |
| POST | `/checkins` | `{ humor, energia, sono?, estresse?, observacao? }` (notas 1–5; sono e estresse podem ser `null`). `201` ao criar (+10 pontos), `200` ao editar |

## Hábitos (UC05, UC06, UC09) 🔒 colaborador com onboarding

| Método | Rota | Descrição |
|---|---|---|
| GET | `/habitos?data=AAAA-MM-DD` | hábitos do dia, resumo da semana, próximo lembrete |
| POST | `/habitos` | cria hábito |
| GET | `/habitos/:id?data=` | detalhe e histórico |
| PUT | `/habitos/:id` | edita hábito |
| DELETE | `/habitos/:id` | exclusão lógica (o histórico é mantido) |
| PUT | `/habitos/:id/registro` | `{ data, valor, pausado, avaliacaoSono?, lembretesAtivos? }`. Concluir hoje vale +2 pontos |
| POST | `/habitos/importacao` | importa dados antigos do navegador (uso interno) |

## Lembretes de pausa, descanso e check-in (UC09) 🔒 colaborador com onboarding

| Método | Rota | Descrição |
|---|---|---|
| GET | `/lembretes` | lembretes do colaborador |
| GET | `/lembretes/pendentes` | avisos que devem aparecer agora (a tela consulta a cada 30 s) |
| POST | `/lembretes` | `{ tipo, horario: "HH:mm", diasSemana: [0-6], ativo }` (tipo: PAUSA, DESCANSO ou CHECKIN; dias vazios = todos) |
| PUT | `/lembretes/:id` | edita (cancela um adiamento pendente) |
| DELETE | `/lembretes/:id` | exclui |
| POST | `/lembretes/:id/adiar` | `{ minutos }` (5, 10, 15 ou 30) |
| POST | `/lembretes/:id/dispensar` | fecha o aviso |

Regras: só aparecem se a preferência de notificações do perfil estiver ligada; o de check-in não aparece se o check-in de hoje já foi feito. Os lembretes de cada hábito são configurados no próprio hábito.

## Desafios (UC08, UC14) 🔒

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `/desafios` | todos | colaborador: desafios abertos + sua participação. RH: todos, com contagens agregadas |
| POST | `/desafios` | RH | `{ titulo, descricao?, dataInicio, dataFim, metaRegistros, pontosRecompensa }` |
| PATCH | `/desafios/:id/encerrar` | RH | encerra o desafio |
| POST | `/desafios/:id/participar` | colaborador | entra no desafio |
| POST | `/desafios/:id/progresso` | colaborador | registra o dia (1x por dia). Ao atingir a meta: pontos + medalha "Desafiante" |

## Gamificação (UC10) 🔒 colaborador

| Método | Rota | Descrição |
|---|---|---|
| GET | `/gamificacao/me` | pontos e todas as medalhas, indicando as conquistadas |

Regras: check-in = 10 pontos; hábito concluído hoje = 2; desafio = pontos definidos pelo RH. Medalhas: *Primeiro passo* (1º check-in), *Consistência* (7 dias seguidos), *Desafiante* (1º desafio concluído).

## Painel do RH (UC11) 🔒 RH

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard?inicio=&fim=&setor=` | indicadores agregados. Padrão: últimos 7 dias; máximo de 90 dias |

Considera apenas colaboradores ativos que concluíram o onboarding. Além de engajamento e médias, traz `desafios` (desafios ativos, participantes, taxa de adesão e conclusões, só em números).

Se o grupo filtrado tiver menos de 5 colaboradores, a resposta traz `privacidade.dadosDisponiveis: false` e nenhum indicador. `setoresDisponiveis` lista só os setores que atingem esse limite.

## Ainda não implementado

- UC12: exportar relatório (CSV/PDF) com registro de auditoria.
- UC13: alerta de baixo engajamento.
