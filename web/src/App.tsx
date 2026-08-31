import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { ColaboradorView } from "./components/ColaboradorView";
import { RhView } from "./components/RhView";
import { api } from "./services/api";
import type { Usuario } from "./types";

const EMAIL_COLABORADOR = "ana.souza@workwell.local";
const EMAIL_RH = "rh.demo@workwell.local";

async function buscarUsuarios() {
  return api<Usuario[]>("/usuarios");
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("");
}

export default function App() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [emailSelecionado, setEmailSelecionado] = useState(EMAIL_COLABORADOR);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const perfisDemo = useMemo(
    () =>
      usuarios.filter((usuario) =>
        [EMAIL_COLABORADOR, EMAIL_RH].includes(usuario.email),
      ),
    [usuarios],
  );
  const usuario = perfisDemo.find(
    (perfil) => perfil.email === emailSelecionado,
  );

  async function atualizarUsuarios() {
    const dados = await buscarUsuarios();
    setUsuarios(dados);
  }

  useEffect(() => {
    let ativo = true;
    buscarUsuarios()
      .then((dados) => {
        if (!ativo) return;
        setUsuarios(dados);
        setErro(null);
      })
      .catch((falha: Error) => {
        if (ativo) setErro(falha.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return <div className="estado-pagina">Preparando sua experiência...</div>;
  }

  if (erro || !usuario || perfisDemo.length < 2) {
    return (
      <div className="estado-pagina estado-erro">
        <span className="estado-simbolo">!</span>
        <h1>Não foi possível abrir a demonstração</h1>
        <p>{erro ?? "Execute a carga de dados fictícios da API e tente novamente."}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="marca" aria-label="WorkWell">
          <span className="marca-simbolo">W</span>
          <span>WorkWell</span>
        </div>

        <nav className="navegacao" aria-label="Navegação principal">
          <button className="nav-item ativo" type="button">
            <span className="nav-marcador" />
            Visão geral
          </button>
          <button className="nav-item" type="button" disabled>
            Check-ins
            <span className="nav-futuro">MVP</span>
          </button>
          <button className="nav-item" type="button" disabled>
            Metas e hábitos
            <span className="nav-futuro">Em breve</span>
          </button>
        </nav>

        <div className="sidebar-rodape">
          <span className="privacidade-ponto" />
          <div>
            <strong>Dados protegidos</strong>
            <small>Ambiente acadêmico com dados fictícios</small>
          </div>
        </div>
      </aside>

      <section className="conteudo-shell">
        <header className="topbar">
          <span className="ambiente">Demonstração funcional</span>

          <div className="seletor-perfil">
            <label htmlFor="perfil-demo">Visualizar como</label>
            <select
              id="perfil-demo"
              value={emailSelecionado}
              onChange={(evento) => setEmailSelecionado(evento.target.value)}
            >
              {perfisDemo.map((perfil) => (
                <option key={perfil.id} value={perfil.email}>
                  {perfil.perfil === "GESTOR_RH" ? "RH" : "Colaborador"} — {perfil.nome}
                </option>
              ))}
            </select>
            <span className="avatar">{iniciais(usuario.nome)}</span>
          </div>
        </header>

        <main className="conteudo-principal">
          {usuario.perfil === "COLABORADOR" ? (
            <ColaboradorView
              usuario={usuario}
              onUsuarioAtualizado={atualizarUsuarios}
            />
          ) : (
            <RhView usuario={usuario} />
          )}
        </main>
      </section>
    </div>
  );
}
