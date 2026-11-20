/**
 * Tela de acesso: login (UC02) e criação de conta (UC01) no mesmo lugar,
 * alternando entre as duas abas.
 */
import { useState, type FormEvent } from "react";
import { useSessao } from "../../hooks/useSessao";
import { ApiRequestError } from "../../services/api";

type Modo = "login" | "cadastro";

/** Mensagem amigável a partir do erro da API (inclui o primeiro campo inválido). */
function mensagemDeErro(falha: unknown) {
  if (falha instanceof ApiRequestError && falha.detalhes.length) return falha.detalhes[0]!.mensagem;
  return falha instanceof Error ? falha.message : "Não foi possível continuar.";
}

export function AcessoPage() {
  const { entrar, cadastrar } = useSessao();
  const [modo, setModo] = useState<Modo>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      if (modo === "login") await entrar(email, senha);
      else await cadastrar(nome, email, senha);
      // Sucesso: o SessaoProvider guarda o usuário e o App troca de tela sozinho.
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
  }

  return (
    <div className="acesso-pagina">
      <section className="acesso-cartao fade-in">
        <div className="marca acesso-marca">
          <img className="marca-simbolo" src="/logo-workwell.webp" alt="" />
          <span>WorkWell</span>
        </div>
        <h1>{modo === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
        <p className="acesso-subtitulo">Bem-estar no trabalho, um pequeno passo por dia.</p>

        <div className="abas" role="tablist">
          <button type="button" role="tab" aria-selected={modo === "login"} onClick={() => trocarModo("login")}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modo === "cadastro"} onClick={() => trocarModo("cadastro")}>
            Criar conta
          </button>
        </div>

        <form className="formulario" onSubmit={enviar}>
          {modo === "cadastro" && (
            <label className="campo">
              <span>Nome completo</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required minLength={2} />
            </label>
          )}
          <label className="campo">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === "login" ? "current-password" : "new-password"}
              minLength={modo === "cadastro" ? 8 : undefined}
              required
            />
            {modo === "cadastro" && <small>Mínimo de 8 caracteres.</small>}
          </label>

          {erro && (
            <div className="feedback erro" role="alert">
              {erro}
            </div>
          )}

          <button className="botao-primario" type="submit" disabled={enviando}>
            {enviando ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="acesso-rodape">
          Ambiente acadêmico com dados fictícios. Contas de demonstração estão no README do projeto.
        </p>
      </section>
    </div>
  );
}
