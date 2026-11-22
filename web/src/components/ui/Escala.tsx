/**
 * Escala de 1 a 5 (botões), usada no check-in e na avaliação do sono.
 * `aria-pressed` informa aos leitores de tela qual nota está selecionada.
 *
 * Com `opcional`, aparece também o botão "Pular" (valor `null`): no check-in,
 * sono e estresse podem ficar em branco (UC04, fluxo alternativo A2).
 */
import { Annoyed, Frown, Laugh, Meh, Smile } from "lucide-react";

/** Carinhas do humor (layout do Figma): da pior (1) à melhor (5). */
const CARINHAS = [
  { Icone: Frown, rotulo: "Péssimo" },
  { Icone: Annoyed, rotulo: "Ruim" },
  { Icone: Meh, rotulo: "Neutro" },
  { Icone: Smile, rotulo: "Bem" },
  { Icone: Laugh, rotulo: "Ótimo" },
];

type EscalaProps = {
  titulo: string;
  descricao: string;
  valor: number | null;
  inicio: string;
  fim: string;
  onChange: (valor: number | null) => void;
  opcional?: boolean;
  disabled?: boolean;
  /** Mostra carinhas no lugar dos números (usado no humor). */
  carinhas?: boolean;
};

export function Escala({ titulo, descricao, valor, inicio, fim, onChange, opcional = false, disabled = false, carinhas = false }: EscalaProps) {
  return (
    <fieldset className="escala-grupo" disabled={disabled}>
      <legend>
        <strong>
          {titulo} {opcional && <small className="escala-opcional">(opcional)</small>}
        </strong>
        <span>{descricao}</span>
      </legend>
      <div className={`escala-botoes${carinhas ? " escala-carinhas" : ""}`}>
        {[1, 2, 3, 4, 5].map((numero) => (
          <button
            key={numero}
            type="button"
            className={numero === valor ? "selecionado" : ""}
            aria-pressed={numero === valor}
            aria-label={`${titulo}: ${numero} de 5`}
            onClick={() => onChange(numero)}
          >
            {carinhas ? <Carinha numero={numero} /> : numero}
          </button>
        ))}
      </div>
      <div className="escala-legenda">
        <span>{inicio}</span>
        {opcional && (
          <button
            type="button"
            className={`escala-pular${valor === null ? " selecionado" : ""}`}
            aria-pressed={valor === null}
            onClick={() => onChange(null)}
          >
            Pular
          </button>
        )}
        <span>{fim}</span>
      </div>
    </fieldset>
  );
}

/** Ícone e nome da carinha de uma nota. */
function Carinha({ numero }: { numero: number }) {
  const { Icone, rotulo } = CARINHAS[numero - 1]!;
  return (
    <>
      <Icone size={24} aria-hidden="true" />
      <small>{rotulo}</small>
    </>
  );
}
