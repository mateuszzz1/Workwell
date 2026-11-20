/**
 * Escala de 1 a 5 (botões), usada no check-in e na avaliação do sono.
 * `aria-pressed` informa aos leitores de tela qual nota está selecionada.
 *
 * Com `opcional`, aparece também o botão "Pular" (valor `null`): no check-in,
 * sono e estresse podem ficar em branco (UC04, fluxo alternativo A2).
 */
type EscalaProps = {
  titulo: string;
  descricao: string;
  valor: number | null;
  inicio: string;
  fim: string;
  onChange: (valor: number | null) => void;
  opcional?: boolean;
  disabled?: boolean;
};

export function Escala({ titulo, descricao, valor, inicio, fim, onChange, opcional = false, disabled = false }: EscalaProps) {
  return (
    <fieldset className="escala-grupo" disabled={disabled}>
      <legend>
        <strong>
          {titulo} {opcional && <small className="escala-opcional">(opcional)</small>}
        </strong>
        <span>{descricao}</span>
      </legend>
      <div className="escala-botoes">
        {[1, 2, 3, 4, 5].map((numero) => (
          <button
            key={numero}
            type="button"
            className={numero === valor ? "selecionado" : ""}
            aria-pressed={numero === valor}
            aria-label={`${titulo}: ${numero} de 5`}
            onClick={() => onChange(numero)}
          >
            {numero}
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
