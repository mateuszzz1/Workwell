/**
 * Gráfico de barras (só CSS) com humor e energia de cada dia do período.
 * Dias sem check-in aparecem vazios, para mostrar a regularidade.
 */
import type { Checkin } from "../../types";
import { diaMes } from "../../utils/formatacao";

type GraficoCheckinsProps = { historico: Checkin[]; hoje: string; dias: number };

/** Lista dos `dias` dias que terminam em `hoje` (AAAA-MM-DD). */
function diasDoPeriodo(hoje: string, dias: number) {
  const fim = new Date(`${hoje}T12:00:00Z`);
  return Array.from({ length: dias }, (_, indice) => {
    const dia = new Date(fim);
    dia.setUTCDate(fim.getUTCDate() - (dias - 1 - indice));
    return dia.toISOString().slice(0, 10);
  });
}

export function GraficoCheckins({ historico, hoje, dias }: GraficoCheckinsProps) {
  const porDia = new Map(historico.map((checkin) => [checkin.data.slice(0, 10), checkin]));
  const mensal = dias > 7;

  return (
    <div className="grafico-checkins">
      <div className={`grafico-checkins-barras${mensal ? " mensal" : ""}`} role="img" aria-label="Humor e energia por dia">
        {diasDoPeriodo(hoje, dias).map((dia, indice) => {
          const checkin = porDia.get(dia);
          // No mês, mostra a data a cada 5 dias para não poluir o eixo.
          const mostrarRotulo = !mensal || indice % 5 === 0 || indice === dias - 1;
          return (
            <div className="grafico-checkins-coluna" key={dia} title={checkin ? `${diaMes(dia)}: humor ${checkin.humor}, energia ${checkin.energia}` : `${diaMes(dia)}: sem check-in`}>
              <div className="grafico-checkins-trilho">
                <span className="barra-humor" style={{ height: `${((checkin?.humor ?? 0) / 5) * 100}%` }} />
                <span className="barra-energia" style={{ height: `${((checkin?.energia ?? 0) / 5) * 100}%` }} />
              </div>
              <small>{mostrarRotulo ? diaMes(dia) : ""}</small>
            </div>
          );
        })}
      </div>
      <div className="grafico-legenda">
        <span><i className="barra-humor" /> Humor</span>
        <span><i className="barra-energia" /> Energia</span>
      </div>
    </div>
  );
}
