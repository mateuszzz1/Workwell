/**
 * Tela de acesso: login (UC02) e criação de conta (UC01) no mesmo lugar.
 * O botão abaixo do formulário alterna entre os dois modos.
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

  const login = modo === "login";

  return (
    <div className="acesso-pagina">
      <header className="acesso-topo">
        <img className="acesso-logo" src="/logo-workwell.webp" alt="WorkWell" />
        <h1>{login ? "Bem-estar que faz sentido" : "Criar conta"}</h1>
        <p>{login ? "Cuide de você e da sua equipe" : "Leva menos de um minuto"}</p>
      </header>

      <section className="acesso-cartao fade-in">
        <form className="formulario" onSubmit={enviar}>
          {!login && (
            <label className="campo">
              <span>Nome completo</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Ana Souza" required minLength={2} />
            </label>
          )}
          <label className="campo">
            <span>E-mail corporativo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Email" required />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={login ? "current-password" : "new-password"}
              placeholder={login ? "Senha" : "Mínimo 8 caracteres"}
              minLength={login ? undefined : 8}
              required
            />
          </label>

          {erro && (
            <div className="feedback erro" role="alert">
              {erro}
            </div>
          )}

          <button className="botao-primario acesso-botao" type="submit" disabled={enviando}>
            {enviando ? "Aguarde..." : login ? "Entrar" : "Criar minha conta →"}
          </button>
        </form>

        <div className="acesso-divisor">ou</div>

        <button type="button" className="acesso-alternar" onClick={() => trocarModo(login ? "cadastro" : "login")}>
          {login ? "Sou novo(a) — criar conta" : "Já tenho conta — entrar"}
        </button>

        <p className="acesso-rodape">Ambiente acadêmico com dados fictícios.</p>
      </section>
    </div>
  );
}
