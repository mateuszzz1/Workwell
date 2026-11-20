/**
 * Lembretes de pausa, descanso e check-in (UC09).
 *
 * O colaborador escolhe o tipo, o horário e os dias da semana. Os avisos
 * aparecem na tela (componente AvisoLembretes) e podem ser adiados.
 * Os lembretes de cada hábito continuam sendo configurados no próprio hábito.
 */
import { useState, type FormEvent } from "react";
import { useCarregar } from "../../hooks/useCarregar";
import { useUsuarioLogado } from "../../hooks/useSessao";
import { ApiRequestError } from "../../services/api";
import { criarLembrete, editarLembrete, excluirLembrete, listarLembretes } from "../../services/workwell";
import type { Lembrete, NovoLembrete, TipoLembrete } from "../../types";

const NOMES_TIPO: Record<TipoLembrete, string> = {
  PAUSA: "Pausa",
  DESCANSO: "Descanso",
  CHECKIN: "Check-in",
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOVO: NovoLembrete = { tipo: "PAUSA", horario: "15:00", diasSemana: [1, 2, 3, 4, 5], ativo: true };

/** "todos os dias", "dias úteis" ou a lista de dias. */
function descreverDias(dias: number[]) {
  if (dias.length === 0 || dias.length === 7) return "Todos os dias";
  if ([1, 2, 3, 4, 5].every((dia) => dias.includes(dia)) && dias.length === 5) return "Dias úteis";
  return [...dias].sort().map((dia) => DIAS[dia]).join(", ");
}

export function LembretesPage() {
  const usuario = useUsuarioLogado();
  const { dados: lembretes, erro: erroLista, recarregar } = useCarregar(listarLembretes);
  const [formulario, setFormulario] = useState<NovoLembrete>(NOVO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarDia(dia: number) {
    setFormulario((atual) => ({
      ...atual,
      diasSemana: atual.diasSemana.includes(dia) ? atual.diasSemana.filter((d) => d !== dia) : [...atual.diasSemana, dia],
    }));
  }

  function editar(lembrete: Lembrete) {
    setEditandoId(lembrete.id);
    setFormulario({ tipo: lembrete.tipo, horario: lembrete.horario, diasSemana: lembrete.diasSemana, ativo: lembrete.ativo });
  }

  function limpar() {
    setEditandoId(null);
    setFormulario(NOVO);
  }

  /** Executa uma operação, mostra erro se falhar e recarrega a lista. */
  async function executar(operacao: () => Promise<unknown>) {
    setSalvando(true);
    setErro(null);
    try {
      await operacao();
      recarregar();
      return true;
    } catch (falha) {
      const detalhe = falha instanceof ApiRequestError ? falha.detalhes[0]?.mensagem : undefined;
      setErro(detalhe ?? (falha instanceof Error ? falha.message : "Não foi possível salvar."));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await executar(() => (editandoId ? editarLembrete(editandoId, formulario) : criarLembrete(formulario)));
    if (ok) limpar();
  }

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Lembretes</span>
          <h1>Pausas e descanso no seu ritmo</h1>
          <p>Escolha quando a plataforma deve lembrar você de fazer uma pausa, descansar ou registrar o check-in.</p>
        </div>
      </section>

      {!usuario.prefNotificacao && (
        <div className="feedback erro">Os lembretes estão desativados no seu perfil. Ative-os para receber os avisos.</div>
      )}

      <section className="grade-principal">
        <form className="painel formulario" onSubmit={salvar}>
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">{editandoId ? "Editar" : "Novo"} lembrete</span>
              <h2>{editandoId ? "Ajustar lembrete" : "Criar lembrete"}</h2>
            </div>
          </div>

          <div className="campos-linha">
            <label className="campo">
              <span>Tipo</span>
              <select value={formulario.tipo} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value as TipoLembrete })}>
                {Object.entries(NOMES_TIPO).map(([valor, nome]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Horário</span>
              <input type="time" required value={formulario.horario} onChange={(e) => setFormulario({ ...formulario, horario: e.target.value })} />
            </label>
          </div>

          <fieldset className="campo dias-semana">
            <span>Dias (nenhum marcado = todos os dias)</span>
            <div>
              {DIAS.map((nome, dia) => (
                <button
                  key={nome}
                  type="button"
                  className={formulario.diasSemana.includes(dia) ? "selecionado" : ""}
                  aria-pressed={formulario.diasSemana.includes(dia)}
                  onClick={() => alternarDia(dia)}
                >
                  {nome}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="campo-checkbox">
            <input type="checkbox" checked={formulario.ativo} onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })} />
            Lembrete ativo
          </label>

          {erro && <div className="feedback erro" role="alert">{erro}</div>}

          <div className="botoes-linha">
            {editandoId && (
              <button type="button" className="botao-secundario" onClick={limpar}>
                Cancelar
              </button>
            )}
            <button className="botao-primario" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar lembrete"}
            </button>
          </div>
        </form>

        <aside className="painel">
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Seus lembretes</span>
              <h2>Agenda</h2>
            </div>
          </div>
          {erroLista && <div className="feedback erro">{erroLista}</div>}
          {lembretes?.length === 0 && <p>Nenhum lembrete ainda. Que tal uma pausa às 15h?</p>}
          <div className="lista-desafios-rh">
            {lembretes?.map((lembrete) => (
              <div key={lembrete.id} className={`desafio-rh-item${lembrete.ativo ? "" : " inativo"}`}>
                <div>
                  <strong>
                    {lembrete.horario} · {NOMES_TIPO[lembrete.tipo]}
                  </strong>
                  <small>
                    {descreverDias(lembrete.diasSemana)}
                    {lembrete.ativo ? "" : " · desativado"}
                  </small>
                </div>
                <div className="botoes-linha">
                  <button type="button" className="botao-secundario" onClick={() => editar(lembrete)}>
                    Editar
                  </button>
                  <button type="button" className="botao-secundario" onClick={() => executar(() => excluirLembrete(lembrete.id))}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
