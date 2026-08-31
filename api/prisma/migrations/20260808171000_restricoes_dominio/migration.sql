-- Regras do domínio protegidas também pelo PostgreSQL.

ALTER TABLE "Usuario"
  ADD CONSTRAINT "Usuario_pontosTotal_check" CHECK ("pontosTotal" >= 0);

ALTER TABLE "Checkin"
  ADD CONSTRAINT "Checkin_humor_check" CHECK ("humor" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Checkin_energia_check" CHECK ("energia" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Checkin_sono_check" CHECK ("sono" IS NULL OR "sono" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Checkin_estresse_check" CHECK ("estresse" IS NULL OR "estresse" BETWEEN 1 AND 5);

ALTER TABLE "Meta"
  ADD CONSTRAINT "Meta_frequenciaAlvo_check" CHECK ("frequenciaAlvo" > 0),
  ADD CONSTRAINT "Meta_periodo_check" CHECK ("dataFim" IS NULL OR "dataFim" >= "dataInicio");

ALTER TABLE "Desafio"
  ADD CONSTRAINT "Desafio_periodo_check" CHECK ("dataFim" >= "dataInicio"),
  ADD CONSTRAINT "Desafio_pontosRecompensa_check" CHECK ("pontosRecompensa" >= 0);

ALTER TABLE "ParticipacaoDesafio"
  ADD CONSTRAINT "ParticipacaoDesafio_progresso_check" CHECK ("progresso" BETWEEN 0 AND 100);

ALTER TABLE "AlertaEngajamento"
  ADD CONSTRAINT "AlertaEngajamento_periodo_check" CHECK ("periodoFim" >= "periodoInicio"),
  ADD CONSTRAINT "AlertaEngajamento_quantidade_check" CHECK ("quantidadeColaboradores" >= 0),
  ADD CONSTRAINT "AlertaEngajamento_taxa_check" CHECK ("taxaEngajamento" BETWEEN 0 AND 100),
  ADD CONSTRAINT "AlertaEngajamento_limiar_check" CHECK ("limiarMinimoGrupo" >= 5);

ALTER TABLE "Relatorio"
  ADD CONSTRAINT "Relatorio_periodo_check" CHECK ("periodoFim" >= "periodoInicio");
