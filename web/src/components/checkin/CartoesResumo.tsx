/**
 * Quatro cartões com os indicadores pessoais: sequência, pontos e médias do período.
 */
import type { ResumoColaborador } from "../../types";

type CartoesResumoProps = { resumo: ResumoColaborador; pontos: number };

export function CartoesResumo({ resumo, pontos }: CartoesResumoProps) {
  const periodo = resumo.dias === 30 ? "Últimos 30 dias" : "Últimos sete dias";
  return (
    <section className="metricas-resumo" aria-label="Resumo pessoal">
      <article className="metrica-card destaque-verde">
        <span className="metrica-rotulo">Sequência atual</span>
        <strong>{resumo.sequencia} dias</strong>
        <small>Check-ins seguidos</small>
      </article>
      <article className="metrica-card">
        <span className="metrica-rotulo">Seus pontos</span>
        <strong>{pontos}</strong>
        <small>+10 por check-in, +2 por hábito</small>
      </article>
      <article className="metrica-card">
        <span className="metrica-rotulo">Humor médio</span>
        <strong>
          {resumo.medias.humor ?? "—"}
          <em>/5</em>
        </strong>
        <small>{periodo}</small>
      </article>
      <article className="metrica-card">
        <span className="metrica-rotulo">Energia média</span>
        <strong>
          {resumo.medias.energia ?? "—"}
          <em>/5</em>
        </strong>
        <small>{periodo}</small>
      </article>
    </section>
  );
}
