/**
 * Formulário do check-in diário (UC04): quatro escalas e uma confirmação,
 * tudo em uma única tela. Sono e estresse são opcionais (fluxo A2).
 */
import { useState, type FormEvent } from "react";
import type { DadosCheckin } from "../../services/workwell";
import type { Checkin } from "../../types";
import { Escala } from "../ui/Escala";

/** Valores iniciais: o meio da escala (ou o check-in que está sendo editado). */
function valoresIniciais(checkin: Checkin | null): DadosCheckin {
  if (!checkin) return { humor: 3, energia: 3, sono: 3, estresse: 3, observacao: "" };
  return {
    humor: checkin.humor,
    energia: checkin.energia,
    sono: checkin.sono,
    estresse: checkin.estresse,
    observacao: checkin.observacao ?? "",
  };
}

type FormularioCheckinProps = {
  /** Check-in de hoje, quando o formulário é aberto para edição. */
  checkinAtual: Checkin | null;
  salvando: boolean;
  onSalvar: (dados: DadosCheckin) => void;
  onCancelar?: () => void;
};

export function FormularioCheckin({ checkinAtual, salvando, onSalvar, onCancelar }: FormularioCheckinProps) {
  const [dados, setDados] = useState(() => valoresIniciais(checkinAtual));

  function alterar<Campo extends keyof DadosCheckin>(campo: Campo, valor: DadosCheckin[Campo]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    onSalvar(dados);
  }

  return (
    <form onSubmit={enviar}>
      <div className="escalas-grid">
        {/* Humor e energia são obrigatórios: a escala só devolve null quando é opcional. */}
        <Escala titulo="Humor" descricao="Como está seu estado emocional?" valor={dados.humor} inicio="Muito baixo" fim="Muito bom" carinhas onChange={(v) => v !== null && alterar("humor", v)} />
        <Escala titulo="Energia" descricao="Como está sua disposição?" valor={dados.energia} inicio="Sem energia" fim="Cheio de energia" onChange={(v) => v !== null && alterar("energia", v)} />
        <Escala titulo="Sono" descricao="Como você avalia seu sono?" valor={dados.sono} inicio="Ruim" fim="Excelente" opcional onChange={(v) => alterar("sono", v)} />
        <Escala titulo="Estresse" descricao="Qual foi seu nível de tensão?" valor={dados.estresse} inicio="Muito baixo" fim="Muito alto" opcional onChange={(v) => alterar("estresse", v)} />
      </div>

      <label className="observacao-campo">
        <span>
          Uma observação sobre hoje <small>(opcional)</small>
        </span>
        <textarea
          value={dados.observacao}
          maxLength={500}
          placeholder="Ex.: consegui fazer uma pausa durante a tarde..."
          onChange={(evento) => alterar("observacao", evento.target.value)}
        />
      </label>

      <div className="form-rodape">
        <span>Seus dados individuais são visíveis somente para você.</span>
        <div className="botoes-linha">
          {onCancelar && (
            <button type="button" className="botao-secundario" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button className="botao-primario" disabled={salvando} type="submit">
            {salvando ? "Salvando..." : checkinAtual ? "Salvar alterações" : "Concluir check-in"}
          </button>
        </div>
      </div>
    </form>
  );
}
