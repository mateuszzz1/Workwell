/**
 * Gestão de desafios pelo RH (UC14): criar, acompanhar e encerrar.
 * O acompanhamento mostra só números (participantes e concluídos), sem nomes.
 */
import { useState, type FormEvent } from "react";
import { useCarregar } from "../../hooks/useCarregar";
import { ApiRequestError } from "../../services/api";
import { criarDesafio, encerrarDesafio, listarDesafiosRh } from "../../services/workwell";
import type { NovoDesafio } from "../../types";
import { dataHoje, formatarPeriodo } from "../../utils/formatacao";

const NOVO_DESAFIO: NovoDesafio = {
  titulo: "",
  descricao: "",
  dataInicio: dataHoje(),
  dataFim: dataHoje(13),
  metaRegistros: 5,
  pontosRecompensa: 50,
};

export function DesafiosRhPage() {
  const { dados: desafios, erro: erroLista, recarregar } = useCarregar(listarDesafiosRh);
  const [formulario, setFormulario] = useState<NovoDesafio>(NOVO_DESAFIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function alterar<Campo extends keyof NovoDesafio>(campo: Campo, valor: NovoDesafio[Campo]) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      await criarDesafio({ ...formulario, descricao: formulario.descricao?.trim() || null });
      setMensagem("Desafio criado e disponível para os colaboradores.");
      setFormulario(NOVO_DESAFIO);
      recarregar();
    } catch (falha) {
      const detalhe = falha instanceof ApiRequestError ? falha.detalhes[0]?.mensagem : undefined;
      setErro(detalhe ?? (falha instanceof Error ? falha.message : "Não foi possível criar o desafio."));
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar(id: number) {
    if (!window.confirm("Encerrar este desafio? Os colaboradores não poderão mais registrar progresso.")) return;
    try {
      await encerrarDesafio(id);
      recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível encerrar.");
    }
  }

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Engajamento</span>
          <h1>Desafios da empresa</h1>
          <p>Crie desafios coletivos de bem-estar. Você acompanha a adesão sem ver quem participa.</p>
        </div>
      </section>

      <section className="grade-principal">
        {/* Formulário de criação */}
        <form className="painel formulario" onSubmit={criar}>
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Novo desafio</span>
              <h2>Criar desafio</h2>
            </div>
          </div>
          <label className="campo">
            <span>Título</span>
            <input value={formulario.titulo} maxLength={80} required onChange={(e) => alterar("titulo", e.target.value)} />
          </label>
          <label className="campo">
            <span>
              Descrição <small>(opcional)</small>
            </span>
            <textarea value={formulario.descricao ?? ""} maxLength={300} onChange={(e) => alterar("descricao", e.target.value)} />
          </label>
          <div className="campos-linha">
            <label className="campo">
              <span>Início</span>
              <input type="date" value={formulario.dataInicio} required onChange={(e) => alterar("dataInicio", e.target.value)} />
            </label>
            <label className="campo">
              <span>Fim</span>
              <input type="date" value={formulario.dataFim} min={formulario.dataInicio} required onChange={(e) => alterar("dataFim", e.target.value)} />
            </label>
          </div>
          <div className="campos-linha">
            <label className="campo">
              <span>Meta (dias)</span>
              <input type="number" min={1} max={60} value={formulario.metaRegistros} required onChange={(e) => alterar("metaRegistros", Number(e.target.value))} />
            </label>
            <label className="campo">
              <span>Pontos</span>
              <input type="number" min={0} max={500} value={formulario.pontosRecompensa} required onChange={(e) => alterar("pontosRecompensa", Number(e.target.value))} />
            </label>
          </div>

          {mensagem && <div className="feedback sucesso" role="status">{mensagem}</div>}
          {erro && <div className="feedback erro" role="alert">{erro}</div>}

          <button className="botao-primario" type="submit" disabled={salvando}>
            {salvando ? "Criando..." : "Criar desafio"}
          </button>
        </form>

        {/* Lista com adesão agregada */}
        <aside className="painel">
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Acompanhamento</span>
              <h2>Desafios criados</h2>
            </div>
          </div>
          {erroLista && <div className="feedback erro">{erroLista}</div>}
          {!desafios && !erroLista && <p>Carregando...</p>}
          {desafios?.length === 0 && <p>Nenhum desafio criado ainda.</p>}
          <div className="lista-desafios-rh">
            {desafios?.map((desafio) => (
              <div key={desafio.id} className="desafio-rh-item">
                <div>
                  <strong>{desafio.titulo}</strong>
                  <small>
                    {formatarPeriodo(desafio.dataInicio, desafio.dataFim)} · meta {desafio.metaRegistros} dias · +{desafio.pontosRecompensa} pts
                  </small>
                  <small>
                    {desafio.participantes} participante(s) · {desafio.concluidos} concluíram
                  </small>
                </div>
                {desafio.status === "ATIVO" ? (
                  <button type="button" className="botao-secundario" onClick={() => encerrar(desafio.id)}>
                    Encerrar
                  </button>
                ) : (
                  <span className="periodo-tag">Encerrado</span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
