/**
 * Progresso pessoal (UC07): gráficos semanal e mensal do check-in,
 * médias do período, histórico e medalhas (UC10).
 */
import { useCallback, useState } from "react";
import { CartoesResumo } from "../../components/checkin/CartoesResumo";
import { GraficoCheckins } from "../../components/checkin/GraficoCheckins";
import { ListaHistorico } from "../../components/checkin/ListaHistorico";
import { useCarregar } from "../../hooks/useCarregar";
import { useUsuarioLogado } from "../../hooks/useSessao";
import { buscarGamificacao, buscarResumoCheckin } from "../../services/workwell";

type Periodo = 7 | 30;

export function ProgressoPage() {
  const usuario = useUsuarioLogado();
  const [periodo, setPeriodo] = useState<Periodo>(7);

  // useCallback: a busca só muda (e recarrega) quando o período muda.
  const buscarResumo = useCallback(() => buscarResumoCheckin(periodo), [periodo]);
  const { dados: resumo, erro } = useCarregar(buscarResumo);
  const { dados: gamificacao } = useCarregar(buscarGamificacao);

  if (erro) return <div className="feedback erro">{erro}</div>;

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Seu progresso</span>
          <h1>Como você tem evoluído</h1>
          <p>Acompanhe seu humor e sua energia ao longo da semana ou do mês.</p>
        </div>
        <div className="abas abas-compactas" role="tablist" aria-label="Período">
          <button type="button" role="tab" aria-selected={periodo === 7} onClick={() => setPeriodo(7)}>
            Semana
          </button>
          <button type="button" role="tab" aria-selected={periodo === 30} onClick={() => setPeriodo(30)}>
            Mês
          </button>
        </div>
      </section>

      {!resumo || resumo.dias !== periodo ? (
        <div className="carregando-card">Carregando seu progresso...</div>
      ) : (
        <>
          <CartoesResumo resumo={resumo} pontos={usuario.pontosTotal} />

          <article className="painel">
            <div className="painel-titulo">
              <div>
                <span className="eyebrow">{periodo === 7 ? "Gráfico semanal" : "Gráfico mensal"}</span>
                <h2>Humor e energia por dia</h2>
              </div>
              <span className="periodo-tag">{periodo} dias</span>
            </div>
            <GraficoCheckins historico={resumo.historico} hoje={resumo.hoje} dias={periodo} />
          </article>

          <section className="grade-principal">
            {gamificacao && (
              <article className="painel">
                <div className="painel-titulo">
                  <div>
                    <span className="eyebrow">Conquistas</span>
                    <h2>Suas medalhas</h2>
                  </div>
                </div>
                <div className="medalhas-grade">
                  {gamificacao.medalhas.map((medalha) => (
                    <div key={medalha.id} className={`medalha${medalha.conquistada ? " conquistada" : ""}`}>
                      <span className="medalha-simbolo" aria-hidden="true">
                        {medalha.conquistada ? "★" : "☆"}
                      </span>
                      <strong>{medalha.nome}</strong>
                      <small>{medalha.conquistada ? "Conquistada" : medalha.criterio}</small>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <aside className="painel historico-painel">
              <div className="painel-titulo">
                <div>
                  <span className="eyebrow">Histórico</span>
                  <h2>Registros do período</h2>
                </div>
              </div>
              <ListaHistorico historico={resumo.historico} />
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
