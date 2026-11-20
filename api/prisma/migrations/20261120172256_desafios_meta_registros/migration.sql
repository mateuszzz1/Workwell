-- AlterTable
ALTER TABLE "Desafio" ADD COLUMN     "metaRegistros" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "ParticipacaoDesafio" ADD COLUMN     "ultimoRegistro" DATE;
