# WorkWell

Protótipo acadêmico de uma plataforma web de bem-estar corporativo. O projeto tem dois perfis: colaborador e gestor de RH. Dados individuais pertencem ao colaborador; o RH deve receber somente indicadores agregados e anônimos.

## Stack

- TypeScript: uma linguagem para interface e servidor, com tipos explícitos para facilitar revisão e explicação.
- React + Vite: interface web responsiva.
- Node.js + Express: API REST e regras de negócio.
- PostgreSQL: banco relacional local.
- Prisma: modelo de dados, migrações e acesso tipado ao banco.

## Pré-requisitos

- Node.js 24 LTS e npm.
- PostgreSQL 18.
- VS Code com as extensões recomendadas pelo projeto.

Após instalar o Node.js, feche e abra novamente o VS Code para atualizar o `PATH` dos terminais. Neste computador, o PowerShell bloqueia o atalho `npm.ps1`; por isso os exemplos usam `npm.cmd`, sem alterar a política de segurança do Windows. No Prompt de Comando, `npm` também funciona.

## Executar localmente

Abra dois terminais no VS Code.

Terminal da API:

```powershell
cd api
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
```

Terminal da interface:

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

A API utiliza `http://localhost:3333/api` e a interface utiliza o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Rotas estruturais disponíveis:

- `GET /api`: identificação da aplicação e da etapa;
- `GET /api/health`: estado da API e da conexão com o banco;
- `GET /api/usuarios`: listagem provisória usada no teste de integração;
- `POST /api/usuarios`: criação provisória com validação de nome e e-mail.
- `GET /api/checkins/usuario/:id/resumo`: check-in de hoje, histórico e médias pessoais;
- `POST /api/checkins`: cria ou atualiza o check-in diário;
- `GET /api/dashboard/:gestorId`: indicadores agregados e anônimos do RH.

Antes de gravar a demonstração, restaure os dados fictícios para que Ana comece com o check-in de hoje pendente:

```powershell
cd api
npm.cmd run demo:reset
```

## Verificações antes de enviar código

```powershell
cd api
npm.cmd run typecheck
npm.cmd run build

cd ..\web
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Segurança básica

- O arquivo `api/.env` contém credenciais e não pode ser versionado.
- Dados de check-in individuais não podem aparecer em rotas ou telas de RH.
- Relatórios de RH devem aplicar um tamanho mínimo de grupo antes de exibir médias.
- Não usar dados reais de saúde durante o desenvolvimento; criar dados fictícios.
