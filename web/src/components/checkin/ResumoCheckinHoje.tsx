/**
 * Resumo do check-in já feito hoje, com o botão "Editar"
 * (UC04, fluxo alternativo A1).
 */
import type { Checkin } from "../../types";
import { nota } from "./formatacao-checkin";

type ResumoCheckinHojeProps = { checkin: Checkin; onEditar: () => void };

export function ResumoCheckinHoje({ checkin, onEditar }: ResumoCheckinHojeProps) {
  const itens = [
    { rotulo: "Humor", valor: nota(checkin.humor) },
    { rotulo: "Energia", valor: nota(checkin.energia) },
    { rotulo: "Sono", valor: nota(checkin.sono) },
    { rotulo: "Estresse", valor: nota(checkin.estresse) },
  ];

  return (
    <div className="resumo-checkin">
      <p className="resumo-checkin-titulo">✓ Você já fez o check-in de hoje. Obrigado por se cuidar!</p>
      <div className="resumo-checkin-notas">
        {itens.map((item) => (
          <div key={item.rotulo}>
            <small>{item.rotulo}</small>
            <strong>{item.valor}</strong>
          </div>
        ))}
      </div>
      {checkin.observacao && <p className="resumo-checkin-observacao">“{checkin.observacao}”</p>}
      <div className="form-rodape">
        <span>Mudou algo no seu dia? Você pode ajustar o registro até a meia-noite.</span>
        <button type="button" className="botao-secundario" onClick={onEditar}>
          Editar check-in
        </button>
      </div>
    </div>
  );
}
