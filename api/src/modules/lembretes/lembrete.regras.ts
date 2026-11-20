/**
 * Regra "pura" dos lembretes: quais devem aparecer AGORA? (sem banco, testável)
 *
 * Um lembrete aparece quando:
 * - está ativo; e
 * - foi adiado e o horário do adiamento já chegou; OU
 * - não está adiado, hoje é um dos dias escolhidos e o relógio marca o horário dele.
 *
 * A tela consulta a cada 30 segundos, então cada minuto é verificado ao menos uma vez.
 */

export type LembreteRegra = {
  ativo: boolean;
  horario: string; // "HH:mm"
  diasSemana: number[]; // vazio = todos os dias
  adiadoAte: Date | null;
};

/** Relógio de referência: horário "HH:mm" e dia da semana em São Paulo. */
export type Momento = { agora: Date; horario: string; diaSemana: number };

export function deveAparecer(lembrete: LembreteRegra, momento: Momento) {
  if (!lembrete.ativo) return false;

  // Adiado: aparece assim que o horário do adiamento chegar.
  if (lembrete.adiadoAte) return momento.agora >= lembrete.adiadoAte;

  const diaEscolhido = lembrete.diasSemana.length === 0 || lembrete.diasSemana.includes(momento.diaSemana);
  return diaEscolhido && lembrete.horario === momento.horario;
}

/** Momento atual no fuso de São Paulo. */
export function momentoAtual(agora = new Date()): Momento {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { agora, horario: `${valor("hour")}:${valor("minute")}`, diaSemana: dias.indexOf(valor("weekday")) };
}
