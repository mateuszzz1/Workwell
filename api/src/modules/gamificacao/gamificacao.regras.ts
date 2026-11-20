/**
 * Regras da gamificação (UC10 - Atribuir pontos e medalhas).
 *
 * Ficam aqui, num só lugar, quantos pontos cada ação vale e quais medalhas
 * existem. Os outros módulos só chamam as funções do gamificacao.service.
 */

/** Pontos ganhos por ação. */
export const PONTOS = {
  /** Primeiro check-in do dia (editar o check-in não dá pontos de novo). */
  CHECKIN: 10,
  /** Hábito concluído no dia de hoje. */
  HABITO_CONCLUIDO: 2,
} as const;

/** Medalhas disponíveis. O nome é a chave usada no banco. */
export const MEDALHAS = {
  PRIMEIRO_PASSO: {
    nome: "Primeiro passo",
    descricao: "Concedida após o primeiro check-in.",
    criterio: "Realizar 1 check-in diário.",
    icone: "primeiro-passo",
  },
  CONSISTENCIA: {
    nome: "Consistência",
    descricao: "Concedida por uma sequência de check-ins.",
    criterio: "Realizar check-in por 7 dias consecutivos.",
    icone: "consistencia",
  },
  DESAFIANTE: {
    nome: "Desafiante",
    descricao: "Concedida ao concluir um desafio da empresa.",
    criterio: "Concluir 1 desafio.",
    icone: "desafiante",
  },
} as const;

/** Dias seguidos de check-in necessários para a medalha "Consistência". */
export const DIAS_PARA_CONSISTENCIA = 7;
