/*
  Warnings:

  - Added the required column `atualizadoEm` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('COLABORADOR', 'GESTOR_RH');

-- CreateEnum
CREATE TYPE "CategoriaHabito" AS ENUM ('SONO', 'ATIVIDADE_FISICA', 'ALIMENTACAO', 'PAUSA', 'ESTRESSE');

-- CreateEnum
CREATE TYPE "PeriodoMeta" AS ENUM ('DIARIA', 'SEMANAL');

-- CreateEnum
CREATE TYPE "TipoLembrete" AS ENUM ('PAUSA', 'DESCANSO', 'CHECKIN', 'META');

-- CreateEnum
CREATE TYPE "StatusDesafio" AS ENUM ('ATIVO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "FormatoRelatorio" AS ENUM ('PDF', 'CSV');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "areaResponsavel" TEXT,
ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "empresaId" INTEGER,
ADD COLUMN     "onboardingConcluido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perfil" "PerfilUsuario" NOT NULL DEFAULT 'COLABORADOR',
ADD COLUMN     "pontosTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prefNotificacao" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "senhaHash" TEXT,
ADD COLUMN     "setor" TEXT;

-- Os usuários de teste existentes recebem a data atual. Novas atualizações
-- continuam sendo controladas pelo Prisma por meio de @updatedAt.
ALTER TABLE "Usuario" ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "porte" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkin" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "humor" INTEGER NOT NULL,
    "energia" INTEGER NOT NULL,
    "sono" INTEGER,
    "estresse" INTEGER,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habito" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" "CategoriaHabito" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "habitoId" INTEGER NOT NULL,
    "frequenciaAlvo" INTEGER NOT NULL,
    "periodo" "PeriodoMeta" NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroHabito" (
    "id" SERIAL NOT NULL,
    "metaId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroHabito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lembrete" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoLembrete" NOT NULL,
    "horario" TIME(0) NOT NULL,
    "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desafio" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "criadoPorId" INTEGER,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "pontosRecompensa" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusDesafio" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Desafio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipacaoDesafio" (
    "usuarioId" INTEGER NOT NULL,
    "desafioId" INTEGER NOT NULL,
    "dataAdesao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "dataConclusao" TIMESTAMP(3),

    CONSTRAINT "ParticipacaoDesafio_pkey" PRIMARY KEY ("usuarioId","desafioId")
);

-- CreateTable
CREATE TABLE "Medalha" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icone" TEXT,
    "criterio" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medalha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConquistaMedalha" (
    "usuarioId" INTEGER NOT NULL,
    "medalhaId" INTEGER NOT NULL,
    "dataConquista" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConquistaMedalha_pkey" PRIMARY KEY ("usuarioId","medalhaId")
);

-- CreateTable
CREATE TABLE "AlertaEngajamento" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "gestorDestinatarioId" INTEGER,
    "setor" TEXT,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "quantidadeColaboradores" INTEGER NOT NULL,
    "taxaEngajamento" DECIMAL(5,2) NOT NULL,
    "limiarMinimoGrupo" INTEGER NOT NULL DEFAULT 5,
    "visualizado" BOOLEAN NOT NULL DEFAULT false,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visualizadoEm" TIMESTAMP(3),

    CONSTRAINT "AlertaEngajamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relatorio" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "gestorId" INTEGER NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "setorFiltro" TEXT,
    "formato" "FormatoRelatorio" NOT NULL,
    "caminhoArquivo" TEXT,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE INDEX "Empresa_nome_idx" ON "Empresa"("nome");

-- CreateIndex
CREATE INDEX "Checkin_data_idx" ON "Checkin"("data");

-- CreateIndex
CREATE UNIQUE INDEX "Checkin_usuarioId_data_key" ON "Checkin"("usuarioId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Habito_nome_categoria_key" ON "Habito"("nome", "categoria");

-- CreateIndex
CREATE INDEX "Meta_usuarioId_ativa_idx" ON "Meta"("usuarioId", "ativa");

-- CreateIndex
CREATE INDEX "Meta_habitoId_idx" ON "Meta"("habitoId");

-- CreateIndex
CREATE INDEX "RegistroHabito_data_idx" ON "RegistroHabito"("data");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroHabito_metaId_data_key" ON "RegistroHabito"("metaId", "data");

-- CreateIndex
CREATE INDEX "Lembrete_usuarioId_ativo_idx" ON "Lembrete"("usuarioId", "ativo");

-- CreateIndex
CREATE INDEX "Desafio_empresaId_status_idx" ON "Desafio"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Desafio_criadoPorId_idx" ON "Desafio"("criadoPorId");

-- CreateIndex
CREATE INDEX "ParticipacaoDesafio_desafioId_concluido_idx" ON "ParticipacaoDesafio"("desafioId", "concluido");

-- CreateIndex
CREATE UNIQUE INDEX "Medalha_nome_key" ON "Medalha"("nome");

-- CreateIndex
CREATE INDEX "ConquistaMedalha_medalhaId_idx" ON "ConquistaMedalha"("medalhaId");

-- CreateIndex
CREATE INDEX "AlertaEngajamento_empresaId_periodoInicio_periodoFim_idx" ON "AlertaEngajamento"("empresaId", "periodoInicio", "periodoFim");

-- CreateIndex
CREATE INDEX "AlertaEngajamento_gestorDestinatarioId_visualizado_idx" ON "AlertaEngajamento"("gestorDestinatarioId", "visualizado");

-- CreateIndex
CREATE INDEX "Relatorio_empresaId_geradoEm_idx" ON "Relatorio"("empresaId", "geradoEm");

-- CreateIndex
CREATE INDEX "Relatorio_gestorId_idx" ON "Relatorio"("gestorId");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_perfil_idx" ON "Usuario"("empresaId", "perfil");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_setor_idx" ON "Usuario"("empresaId", "setor");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_habitoId_fkey" FOREIGN KEY ("habitoId") REFERENCES "Habito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHabito" ADD CONSTRAINT "RegistroHabito_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "Meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Desafio" ADD CONSTRAINT "Desafio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Desafio" ADD CONSTRAINT "Desafio_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacaoDesafio" ADD CONSTRAINT "ParticipacaoDesafio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacaoDesafio" ADD CONSTRAINT "ParticipacaoDesafio_desafioId_fkey" FOREIGN KEY ("desafioId") REFERENCES "Desafio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConquistaMedalha" ADD CONSTRAINT "ConquistaMedalha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConquistaMedalha" ADD CONSTRAINT "ConquistaMedalha_medalhaId_fkey" FOREIGN KEY ("medalhaId") REFERENCES "Medalha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaEngajamento" ADD CONSTRAINT "AlertaEngajamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaEngajamento" ADD CONSTRAINT "AlertaEngajamento_gestorDestinatarioId_fkey" FOREIGN KEY ("gestorDestinatarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
