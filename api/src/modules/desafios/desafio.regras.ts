/**
 * Regras "puras" dos desafios: sem banco, fáceis de testar.
 *
 * Como funciona um desafio:
 * - o RH cria com período (início/fim), meta de registros e pontos de recompensa;
 * - o colaborador entra no desafio e registra "fiz hoje" no máximo 1 vez por dia;
 * - ao atingir a meta, o desafio é concluído e os pontos são concedidos.
 */
import { chaveData } from "../../utils/data.js";

type DesafioRegra = { status: "ATIVO" | "ENCERRADO"; dataInicio: Date; dataFim: Date };
type ParticipacaoRegra = { progresso: number; concluido: boolean; ultimoRegistro: Date | null };

/** O desafio está aberto hoje? (ativo e dentro do período) */
export function desafioAberto(desafio: DesafioRegra, hoje: Date) {
  return desafio.status === "ATIVO" && hoje >= desafio.dataInicio && hoje <= desafio.dataFim;
}

/**
 * Pode registrar progresso hoje? Devolve `null` se pode,
 * ou a mensagem explicando por que não pode.
 */
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
