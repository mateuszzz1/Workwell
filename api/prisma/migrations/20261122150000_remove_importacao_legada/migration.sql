-- A importação dos hábitos antigos do navegador (localStorage) foi removida.
-- A coluna que evitava importar o mesmo hábito duas vezes não é mais usada.
DROP INDEX "Meta_usuarioId_origemLocalId_key";

ALTER TABLE "Meta" DROP COLUMN "origemLocalId";
