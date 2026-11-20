/**
 * Página inicial do colaborador: check-in diário (UC04).
 *
 * Segue o caso de uso expandido do relatório:
 * - sem check-in hoje -> mostra o formulário (fluxo principal);
 * - com check-in hoje -> mostra o resumo e a opção "Editar" (fluxo A1);
 * - ao salvar -> mostra pontos, medalhas e a sequência atualizada.
 *
 * O gráfico "Sua semana" é um atalho para o progresso, como pediu a avaliação
 * de usabilidade (EP4: os participantes tiveram dificuldade de achar o gráfico).
 */
import { useState } from "react";
import { CartoesResumo } from "../../components/checkin/CartoesResumo";
import { GraficoCheckins } from "../../components/checkin/GraficoCheckins";
import { FormularioCheckin } from "../../components/checkin/FormularioCheckin";
import { nomeDoDia } from "../../components/checkin/formatacao-checkin";
import { ListaHistorico } from "../../components/checkin/ListaHistorico";
import { ResumoCheckinHoje } from "../../components/checkin/ResumoCheckinHoje";
import { useCarregar } from "../../hooks/useCarregar";
import { useSessao, useUsuarioLogado } from "../../hooks/useSessao";
import { buscarResumoCheckin, salvarCheckin, type DadosCheckin } from "../../services/workwell";

export function InicioPage({ onVerProgresso }: { onVerProgresso: () => void }) {
  const usuario = useUsuarioLogado();
  const { atualizarUsuario } = useSessao();
  const { dados: resumo, erro: erroResumo, recarregar } = useCarregar(buscarResumoCheckin);

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: DadosCheckin) {
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      const resposta = await salvarCheckin(dados);
      const medalhas = resposta.medalhasNovas.length ? ` Nova medalha: ${resposta.medalhasNovas.join(", ")}!` : "";
      setMensagem(resposta.mensagem + medalhas);
      setEditando(false);
      recarregar(); // atualiza sequência, médias e histórico
      await atualizarUsuario(); // atualiza os pontos exibidos no topo
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao salvar check-in.");
    } finally {
      setSalvando(false);
    }
  }

  if (erroResumo) return <div className="feedback erro">{erroResumo}</div>;
  if (!resumo) return <div className="carregando-card">Carregando seu resumo...</div>;

  const checkinHoje = resumo.checkinHoje;
  const mostrarFormulario = !checkinHoje || editando;

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Seu espaço de bem-estar</span>
          <h1>Olá, {usuario.nome.split(" ")[0]}. Como você está hoje?</h1>
          <p>Reserve um minuto para perceber seu dia e acompanhar sua evolução.</p>
        </div>
        <div className="data-hoje">
          <strong>{nomeDoDia(resumo.hoje)}</strong>
          <span>{checkinHoje ? "Check-in concluído" : "Check-in pendente"}</span>
        </div>
      </section>

      <CartoesResumo resumo={resumo} pontos={usuario.pontosTotal} />

      <section className="grade-principal">
        <article className="painel checkin-painel">
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Check-in diário</span>
              <h2>{mostrarFormulario ? "Conte como foi seu dia" : "Seu check-in de hoje"}</h2>
            </div>
            <span className="tempo-estimado">~ 1 minuto</span>
          </div>

          {mensagem && <div className="feedback sucesso" role="status">{mensagem}</div>}
          {erro && <div className="feedback erro" role="alert">{erro}</div>}

          {mostrarFormulario ? (
            <FormularioCheckin
              // A chave recria o formulário ao abrir a edição, carregando os valores salvos.
              key={editando ? "editar" : "novo"}
              checkinAtual={editando ? checkinHoje : null}
              salvando={salvando}
              onSalvar={salvar}
              onCancelar={editando ? () => setEditando(false) : undefined}
            />
          ) : (
            <ResumoCheckinHoje
              checkin={checkinHoje}
              onEditar={() => {
                setMensagem(null);
                setEditando(true);
              }}
            />
          )}
        </article>

        <aside className="painel historico-painel">
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Progresso pessoal</span>
              <h2>Sua semana</h2>
            </div>
            <button type="button" className="botao-secundario" onClick={onVerProgresso}>
              Ver progresso
            </button>
          </div>
          <GraficoCheckins historico={resumo.historico} hoje={resumo.hoje} dias={7} />
          <h3 className="subtitulo-painel">Últimos registros</h3>
          <ListaHistorico historico={resumo.historico} />
          <div className="privacidade-aviso">
            <span className="cadeado">●</span>
            <p>
              <strong>Privacidade desde a estrutura</strong>O RH recebe apenas indicadores coletivos e anônimos.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
