import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { DashboardRh, Usuario } from "../types";

type RhViewProps = { usuario: Usuario };

async function buscarDashboard(gestorId: number) {
  return api<DashboardRh>(`/dashboard/${gestorId}`);
}

function rotuloDia(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${data}T12:00:00.000Z`))
    .replace(".", "");
}

export function RhView({ usuario }: RhViewProps) {
  const [dashboard, setDashboard] = useState<DashboardRh | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    buscarDashboard(usuario.id)
      .then((dados) => {
        if (!ativo) return;
        setDashboard(dados);
        setErro(null);
      })
      .catch((falha: Error) => {
        if (ativo) setErro(falha.message);
      });

    return () => {
      ativo = false;
    };
  }, [usuario.id]);

  if (erro) return <div className="feedback erro">{erro}</div>;
  if (!dashboard) return <div className="carregando-card">Calculando indicadores anônimos...</div>;

  if (!dashboard.privacidade.dadosDisponiveis || !dashboard.indicadores) {
    return (
      <div className="pagina fade-in">
        <section className="cabecalho-pagina">
          <div><span className="eyebrow">Painel de RH</span><h1>Dados temporariamente indisponíveis</h1></div>
        </section>
        <article className="painel privacidade-bloqueio">
          <span className="estado-simbolo">i</span>
          <h2>Proteção contra identificação</h2>
          <p>{dashboard.privacidade.mensagem}</p>
        </article>
      </div>
    );
  }

  const { indicadores } = dashboard;

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Painel de bem-estar organizacional</span>
          <h1>Visão geral da {dashboard.empresa.nome}</h1>
          <p>Indicadores dos últimos sete dias para apoiar decisões de pessoas e cultura.</p>
        </div>
        <div className="selo-anonimo"><span>✓</span><div><strong>Visão anônima</strong><small>Nenhum dado individual</small></div></div>
      </section>

      <section className="metricas-resumo metricas-rh" aria-label="Indicadores organizacionais">
        <article className="metrica-card destaque-verde">
          <span className="metrica-rotulo">Engajamento</span>
          <strong>{indicadores.taxaEngajamento}<em>%</em></strong>
          <small>{indicadores.participantes} participantes no período</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Humor médio</span>
          <strong>{indicadores.humorMedio ?? "—"}<em>/5</em></strong>
          <small>Indicador agregado</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Energia média</span>
          <strong>{indicadores.energiaMedia ?? "—"}<em>/5</em></strong>
          <small>Indicador agregado</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Estresse médio</span>
          <strong>{indicadores.estresseMedio ?? "—"}<em>/5</em></strong>
          <small>Quanto menor, melhor</small>
        </article>
      </section>

      <section className="grade-rh">
        <article className="painel tendencia-painel">
          <div className="painel-titulo">
            <div><span className="eyebrow">Tendência semanal</span><h2>Humor e participação</h2></div>
            <span className="periodo-tag">7 dias</span>
          </div>

          <div className="grafico-barras" aria-label="Humor médio por dia">
            {dashboard.tendencia?.map((dia) => (
              <div className="barra-coluna" key={dia.data}>
                <div className="barra-valor">{dia.humor ?? "—"}</div>
                <div className="barra-trilho">
                  <span style={{ height: `${((dia.humor ?? 0) / 5) * 100}%` }} />
                </div>
                <strong>{rotuloDia(dia.data)}</strong>
                <small>{dia.participantes} resp.</small>
              </div>
            ))}
          </div>
        </article>

        <aside className="painel participacao-painel">
          <div className="painel-titulo"><div><span className="eyebrow">Adesão</span><h2>Participação</h2></div></div>
          <div
            className="anel-progresso"
            style={{ "--progresso": `${Math.min(100, indicadores.taxaEngajamento)}%` } as React.CSSProperties}
          >
            <div><strong>{indicadores.taxaEngajamento}%</strong><span>check-ins esperados</span></div>
          </div>
          <div className="participacao-dados">
            <span><strong>{indicadores.colaboradores}</strong>colaboradores ativos</span>
            <span><strong>{indicadores.participantes}</strong>participaram</span>
          </div>
          <div className="privacidade-aviso compacto">
            <span className="cadeado">●</span>
            <p><strong>Regra de privacidade ativa</strong>Recortes com menos de {dashboard.privacidade.limiarMinimo} pessoas não são exibidos.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
