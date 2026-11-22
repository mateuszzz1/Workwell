/**
 * Painel de bem-estar organizacional do RH (UC11).
 *
 * Mostra apenas indicadores agregados e anônimos, com filtros de período e
 * setor. Se o recorte tiver menos pessoas que o limite de privacidade, a API
 * não envia números e a tela explica o motivo.
 */
import { useCallback, useState, type CSSProperties, type FormEvent } from "react";
import { useCarregar } from "../../hooks/useCarregar";
import { buscarDashboard } from "../../services/workwell";
import type { FiltrosDashboard } from "../../types";
import { dataHoje, diaMes } from "../../utils/formatacao";

/** Rótulo do dia no gráfico: dia da semana em períodos curtos, data em períodos longos. */
function rotuloDia(data: string, totalDias: number) {
  if (totalDias > 7) return diaMes(data);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${data}T12:00:00.000Z`))
    .replace(".", "");
}

export function PainelRhPage() {
  // `filtros` = o que foi aplicado; `rascunho` = o que está sendo digitado no formulário.
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});
  const [rascunho, setRascunho] = useState<FiltrosDashboard>({ inicio: dataHoje(-6), fim: dataHoje() });

  const buscar = useCallback(() => buscarDashboard(filtros), [filtros]);
  const { dados: dashboard, erro } = useCarregar(buscar);

  const [erroFiltro, setErroFiltro] = useState<string | null>(null);

  /** Valida o período no navegador antes de pedir à API (mesmas regras da API). */
  function aplicar(evento: FormEvent) {
    evento.preventDefault();
    const { inicio, fim } = rascunho;
    if (inicio && fim && inicio > fim) return setErroFiltro("A data final deve ser igual ou posterior à inicial.");
    if (inicio && fim && (Date.parse(fim) - Date.parse(inicio)) / 86_400_000 + 1 > 90) {
      return setErroFiltro("Escolha um período de até 90 dias.");
    }
    setErroFiltro(null);
    setFiltros({ ...rascunho });
  }

  // Sem nenhum dado ainda: erro ou carregamento ocupam a página.
  // Depois do primeiro carregamento, erros aparecem junto ao formulário,
  // mantendo os últimos números na tela para o RH corrigir o filtro.
  if (!dashboard && erro) return <div className="feedback erro">{erro}</div>;
  if (!dashboard) return <div className="carregando-card">Calculando indicadores anônimos...</div>;

  const { indicadores, privacidade, periodo } = dashboard;

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina cabecalho-verde">
        <div>
          <span className="eyebrow">Painel de bem-estar organizacional</span>
          <h1>Visão geral da {dashboard.empresa.nome}</h1>
          <p>
            {dashboard.filtros.setor ? `Setor ${dashboard.filtros.setor}` : "Todos os setores"} · {diaMes(periodo.inicio)} a{" "}
            {diaMes(periodo.fim)} ({periodo.dias} dias)
          </p>
        </div>
        <div className="selo-anonimo">
          <span>✓</span>
          <div>
            <strong>Visão anônima</strong>
            <small>Nenhum dado individual</small>
          </div>
        </div>
      </section>

      {/* Filtros (período e setor). Só aparecem setores com gente suficiente. */}
      <form className="painel filtros-painel" onSubmit={aplicar}>
        <label className="campo">
          <span>De</span>
          <input type="date" value={rascunho.inicio ?? ""} max={rascunho.fim} onChange={(e) => setRascunho({ ...rascunho, inicio: e.target.value })} />
        </label>
        <label className="campo">
          <span>Até</span>
          <input type="date" value={rascunho.fim ?? ""} min={rascunho.inicio} onChange={(e) => setRascunho({ ...rascunho, fim: e.target.value })} />
        </label>
        <label className="campo">
          <span>Setor</span>
          <select value={rascunho.setor ?? ""} onChange={(e) => setRascunho({ ...rascunho, setor: e.target.value || undefined })}>
            <option value="">Todos</option>
            {dashboard.setoresDisponiveis.map((setor) => (
              <option key={setor}>{setor}</option>
            ))}
          </select>
        </label>
        <button className="botao-primario" type="submit">
          Aplicar
        </button>
      </form>

      {(erroFiltro ?? erro) && (
        <div className="feedback erro" role="alert">
          {erroFiltro ?? erro}
        </div>
      )}

      {!privacidade.dadosDisponiveis || !indicadores ? (
        <article className="painel privacidade-bloqueio">
          <span className="estado-simbolo">i</span>
          <h2>Proteção contra identificação</h2>
          <p>{privacidade.mensagem}</p>
        </article>
      ) : (
        <>
          <section className="metricas-resumo metricas-rh" aria-label="Indicadores organizacionais">
            <article className="metrica-card destaque-verde">
              <span className="metrica-rotulo">Engajamento</span>
              <strong>
                {indicadores.taxaEngajamento}
                <em>%</em>
              </strong>
              <small>{indicadores.participantes} participantes no período</small>
            </article>
            <article className="metrica-card">
              <span className="metrica-rotulo">Humor médio</span>
              <strong>
                {indicadores.humorMedio ?? "—"}
                <em>/5</em>
              </strong>
              <small>Indicador agregado</small>
            </article>
            <article className="metrica-card">
              <span className="metrica-rotulo">Energia média</span>
              <strong>
                {indicadores.energiaMedia ?? "—"}
                <em>/5</em>
              </strong>
              <small>Indicador agregado</small>
            </article>
            <article className="metrica-card">
              <span className="metrica-rotulo">Estresse médio</span>
              <strong>
                {indicadores.estresseMedio ?? "—"}
                <em>/5</em>
              </strong>
              <small>Quanto menor, melhor</small>
            </article>
          </section>

          <section className="grade-rh">
            <article className="painel tendencia-painel">
              <div className="painel-titulo">
                <div>
                  <span className="eyebrow">Tendência</span>
                  <h2>Humor e participação</h2>
                </div>
                <span className="periodo-tag">{periodo.dias} dias</span>
              </div>

              <div className="grafico-barras" aria-label="Humor médio por dia">
                {dashboard.tendencia?.map((dia) => (
                  <div className="barra-coluna" key={dia.data}>
                    <div className="barra-valor">{dia.humor ?? "—"}</div>
                    <div className="barra-trilho">
                      <span style={{ height: `${((dia.humor ?? 0) / 5) * 100}%` }} />
                    </div>
                    <strong>{rotuloDia(dia.data, periodo.dias)}</strong>
                    <small>{dia.participantes} resp.</small>
                  </div>
                ))}
              </div>
            </article>

            <aside className="painel participacao-painel">
              <div className="painel-titulo">
                <div>
                  <span className="eyebrow">Adesão</span>
                  <h2>Participação</h2>
                </div>
              </div>
              <div className="anel-progresso" style={{ "--progresso": `${Math.min(100, indicadores.taxaEngajamento)}%` } as CSSProperties}>
                <div>
                  <strong>{indicadores.taxaEngajamento}%</strong>
                  <span>check-ins esperados</span>
                </div>
              </div>
              <div className="participacao-dados">
                <span>
                  <strong>{indicadores.colaboradores}</strong>colaboradores ativos
                </span>
                <span>
                  <strong>{indicadores.participantes}</strong>participaram
                </span>
              </div>
              {dashboard.desafios && (
                <div className="adesao-desafios">
                  <span className="eyebrow">Adesão a desafios</span>
                  <strong>{dashboard.desafios.taxaAdesao}%</strong>
                  <small>
                    {dashboard.desafios.participantes} participante(s) em {dashboard.desafios.ativos} desafio(s) ativo(s) ·{" "}
                    {dashboard.desafios.conclusoes} conclusão(ões)
                  </small>
                </div>
              )}
              <div className="privacidade-aviso compacto">
                <span className="cadeado">●</span>
                <p>
                  <strong>Regra de privacidade ativa</strong>Recortes com menos de {privacidade.limiarMinimo} pessoas não são exibidos.
                </p>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
