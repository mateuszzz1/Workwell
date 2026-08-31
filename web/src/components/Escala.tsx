type EscalaProps = {
  titulo: string;
  descricao: string;
  valor: number;
  inicio: string;
  fim: string;
  onChange: (valor: number) => void;
};

export function Escala({
  titulo,
  descricao,
  valor,
  inicio,
  fim,
  onChange,
}: EscalaProps) {
  return (
    <fieldset className="escala-grupo">
      <legend>
        <strong>{titulo}</strong>
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
        <span>{fim}</span>
      </div>
    </fieldset>
  );
}
