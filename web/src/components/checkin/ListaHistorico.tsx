/**
 * Lista dos check-ins do período, do mais recente para o mais antigo.
 */
import type { Checkin } from "../../types";
import { nomeDoDia, nota } from "./formatacao-checkin";

export function ListaHistorico({ historico }: { historico: Checkin[] }) {
  if (historico.length === 0) return <p>Nenhum check-in no período.</p>;

  return (
    <div className="historico-lista">
      {[...historico].reverse().map((checkin) => (
        <div className="historico-item" key={checkin.id}>
          <div className="historico-data">
            <strong>{nomeDoDia(checkin.data)}</strong>
            <span>
              {checkin.data.slice(8, 10)}/{checkin.data.slice(5, 7)}
            </span>
          </div>
          <div className="historico-notas">
            <span>
              <small>Humor</small>
              {checkin.humor}
            </span>
            <span>
              <small>Energia</small>
              {checkin.energia}
            </span>
            <span>
              <small>Estresse</small>
              {nota(checkin.estresse)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
