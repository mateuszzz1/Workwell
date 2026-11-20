/**
 * Meu perfil (UC01 / RF9 - configuração de perfil).
 *
 * O colaborador ajusta nome, cargo, setor e a preferência de lembretes.
 * O e-mail é mostrado, mas não pode ser alterado aqui.
 */
import { useState, type FormEvent } from "react";
import { useCarregar } from "../../hooks/useCarregar";
import { useSessao, useUsuarioLogado } from "../../hooks/useSessao";
import { ApiRequestError } from "../../services/api";
import { atualizarPerfil, buscarOpcoesOnboarding } from "../../services/workwell";

export function PerfilPage() {
  const usuario = useUsuarioLogado();
  const { atualizarUsuario } = useSessao();
  const { dados: opcoes } = useCarregar(buscarOpcoesOnboarding);

  const [nome, setNome] = useState(usuario.nome);
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [setor, setSetor] = useState(usuario.setor ?? "");
  const [notificacoes, setNotificacoes] = useState(usuario.prefNotificacao);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      const atualizado = await atualizarPerfil({ nome, cargo: cargo.trim() || null, setor, prefNotificacao: notificacoes });
      await atualizarUsuario(atualizado); // nome e preferências no topo e nas outras telas
      setMensagem("Perfil atualizado.");
    } catch (falha) {
      const detalhe = falha instanceof ApiRequestError ? falha.detalhes[0]?.mensagem : undefined;
      setErro(detalhe ?? (falha instanceof Error ? falha.message : "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pagina fade-in">
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Configurações</span>
          <h1>Meu perfil</h1>
          <p>Mantenha seus dados atualizados. Eles nunca são exibidos individualmente ao RH.</p>
        </div>
      </section>

      <form className="painel formulario perfil-formulario" onSubmit={salvar}>
        <label className="campo">
          <span>E-mail</span>
          <input value={usuario.email} disabled />
        </label>
        <label className="campo">
          <span>Nome</span>
          <input value={nome} required minLength={2} maxLength={120} onChange={(e) => setNome(e.target.value)} />
        </label>
        <div className="campos-linha">
          <label className="campo">
            <span>Setor</span>
            <select value={setor} required onChange={(e) => setSetor(e.target.value)}>
              <option value="">Selecione...</option>
              {opcoes?.setores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>
              Cargo <small>(opcional)</small>
            </span>
            <input value={cargo} maxLength={80} onChange={(e) => setCargo(e.target.value)} />
          </label>
        </div>
        <label className="campo-checkbox">
          <input type="checkbox" checked={notificacoes} onChange={(e) => setNotificacoes(e.target.checked)} />
          Receber lembretes dentro da plataforma
        </label>

        {mensagem && <div className="feedback sucesso" role="status">{mensagem}</div>}
        {erro && <div className="feedback erro" role="alert">{erro}</div>}

        <div className="botoes-linha">
          <button className="botao-primario" type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
