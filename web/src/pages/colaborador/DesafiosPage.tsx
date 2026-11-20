/**
 * Desafios para o colaborador (UC08): ver os desafios abertos da empresa,
 * participar e registrar o progresso (uma vez por dia).
 */
import { useState } from "react";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { useCarregar } from "../../hooks/useCarregar";
import { useSessao } from "../../hooks/useSessao";
import { listarDesafiosColaborador, participarDesafio, registrarProgressoDesafio } from "../../services/workwell";
import type { DesafioColaborador } from "../../types";
import { diaMes, formatarPeriodo } from "../../utils/formatacao";

export function DesafiosPage() {
  const { atualizarUsuario } = useSessao();
  const { dados: desafios, erro: erroLista, recarregar } = useCarregar(listarDesafiosColaborador);
  const [ocupado, setOcupado] = useState<number | null>(null); // id do desafio sendo salvo
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /** Executa uma ação, mostra o resultado e recarrega a lista. */
  async function executar(id: number, acao: () => Promise<{ mensagem: string }>) {
    setOcupado(id);
    setMensagem(null);
    setErro(null);
    try {
      const resposta = await acao();
      setMensagem(resposta.mensagem);
      recarregar();
      await atualizarUsuario(); // pontos podem ter mudado
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir.");
    } finally {
      setOcupado(null);
    }
  }

  if (erroLista) return <div className="feedback erro">{erroLista}</div>;
  if (!desafios) return <div className="carregando-card">Carregando desafios...</div>;

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Desafios da empresa</span>
          <h1>Pequenos desafios, grandes hábitos</h1>
          <p>Participe, registre seu progresso uma vez por dia e ganhe pontos ao concluir.</p>
        </div>
      </section>

      {mensagem && <div className="feedback sucesso" role="status">{mensagem}</div>}
      {erro && <div className="feedback erro" role="alert">{erro}</div>}

      {desafios.length === 0 ? (
        <article className="painel">
          <p>Nenhum desafio aberto no momento. Fique de olho: o RH pode lançar novos desafios a qualquer hora.</p>
        </article>
      ) : (
        <section className="desafios-grade">
          {desafios.map((desafio) => (
            <CartaoDesafio
              key={desafio.id}
              desafio={desafio}
              ocupado={ocupado === desafio.id}
              onParticipar={() => executar(desafio.id, () => participarDesafio(desafio.id))}
              onRegistrar={() => executar(desafio.id, () => registrarProgressoDesafio(desafio.id))}
            />
          ))}
        </section>
      )}
    </div>
  );
}

type CartaoDesafioProps = {
  desafio: DesafioColaborador;
  ocupado: boolean;
  onParticipar: () => void;
  onRegistrar: () => void;
};

/** Um desafio: dados, progresso pessoal e o botão da próxima ação. */
function CartaoDesafio({ desafio, ocupado, onParticipar, onRegistrar }: CartaoDesafioProps) {
  const participacao = desafio.participacao;

  // Qual botão mostrar depende da situação do colaborador no desafio.
  let acao = <button className="botao-primario" disabled={ocupado} onClick={onParticipar}>Participar</button>;
  if (participacao?.concluido) acao = <span className="selo-concluido">✓ Concluído</span>;
  else if (participacao?.registradoHoje) acao = <span className="periodo-tag">Registrado hoje. Volte amanhã!</span>;
  else if (participacao && !desafio.aberto) acao = <span className="periodo-tag">Começa em {diaMes(desafio.dataInicio)}</span>;
  else if (participacao) acao = <button className="botao-primario" disabled={ocupado} onClick={onRegistrar}>Fiz hoje</button>;

  return (
    <article className="painel desafio-cartao">
      <div className="painel-titulo">
        <div>
          <span className="eyebrow">{formatarPeriodo(desafio.dataInicio, desafio.dataFim)}</span>
          <h2>{desafio.titulo}</h2>
        </div>
        <span className="periodo-tag">+{desafio.pontosRecompensa} pts</span>
      </div>
      {desafio.descricao && <p>{desafio.descricao}</p>}

      {participacao && (
        <div className="desafio-progresso">
          <ProgressBar valor={participacao.progresso} maximo={desafio.metaRegistros} descricao={`Progresso em ${desafio.titulo}`} />
          <small>
            {participacao.progresso} de {desafio.metaRegistros} dias
          </small>
        </div>
      )}

      <div className="desafio-rodape">
        <small>{desafio.participantes} participante(s)</small>
        {acao}
      </div>
    </article>
  );
}
