/**
 * Regras "puras" do check-in: só cálculos, sem banco de dados.
 * Por não dependerem do banco, são fáceis de testar (tests/regras.test.ts).
 */
import { adicionarDias, chaveData } from "../../utils/data.js";

/**
 * Quantos dias seguidos o colaborador fez check-in, contando para trás.
 *
 * Se ainda não fez o de hoje, a sequência continua valendo a partir de
 * ontem (o dia ainda não acabou).
 */
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
