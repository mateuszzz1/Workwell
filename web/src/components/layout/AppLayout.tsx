/**
 * Estrutura visual das telas logadas: menu lateral, barra superior e,
 * no celular, a barra de navegação inferior do colaborador.
 *
 * O menu muda conforme o perfil: o colaborador vê suas páginas pessoais e o
 * RH vê o painel e a gestão de desafios.
 */
import type { ReactNode } from "react";
import { useSessao, useUsuarioLogado } from "../../hooks/useSessao";
import { AvisoLembretes } from "./AvisoLembretes";
import { ColaboradorNav } from "./ColaboradorNav";

export type Pagina = "inicio" | "habitos" | "progresso" | "lembretes" | "desafios" | "perfil" | "painel";

type ItemMenu = { pagina: Pagina; rotulo: string };

const MENU_COLABORADOR: ItemMenu[] = [
  { pagina: "inicio", rotulo: "Check-in" },
  { pagina: "habitos", rotulo: "Metas e hábitos" },
  { pagina: "progresso", rotulo: "Progresso" },
  { pagina: "lembretes", rotulo: "Lembretes" },
  { pagina: "desafios", rotulo: "Desafios" },
  { pagina: "perfil", rotulo: "Meu perfil" },
];

const MENU_RH: ItemMenu[] = [
  { pagina: "painel", rotulo: "Painel organizacional" },
  { pagina: "desafios", rotulo: "Desafios" },
];

/** Iniciais do nome para o avatar (ex.: "Ana Souza" -> "AS"). */
function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("");
}

type AppLayoutProps = {
  pagina: Pagina;
  onNavegar: (pagina: Pagina) => void;
  children: ReactNode;
};

export function AppLayout({ pagina, onNavegar, children }: AppLayoutProps) {
  const usuario = useUsuarioLogado();
  const { sair } = useSessao();
  const colaborador = usuario.perfil === "COLABORADOR";
  const menu = colaborador ? MENU_COLABORADOR : MENU_RH;

  // Classes extras ajustam o layout no celular (veja habitos.css).
  const classes = ["app-shell", colaborador && "colaborador-shell", colaborador && pagina === "habitos" && "habitos-shell"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <aside className="sidebar">
        <div className="marca" aria-label="WorkWell">
          <img className="marca-simbolo" src="/logo-workwell.webp" alt="" />
          <span>WorkWell</span>
        </div>

        <nav className="navegacao" aria-label="Navegação principal">
          {menu.map((item) => (
            <button
              key={item.pagina}
              type="button"
              className={`nav-item${pagina === item.pagina ? " ativo" : ""}`}
              aria-current={pagina === item.pagina ? "page" : undefined}
              onClick={() => onNavegar(item.pagina)}
            >
              <span className="nav-marcador" />
              {item.rotulo}
            </button>
          ))}
        </nav>

        <div className="sidebar-rodape">
          <span className="privacidade-ponto" />
          <div>
            <strong>Dados protegidos</strong>
            <small>{colaborador ? "Seus registros são só seus" : "Somente dados agregados"}</small>
          </div>
        </div>
      </aside>

      <section className="conteudo-shell">
        <header className="topbar">
          <div className="topbar-saudacao">
            <span className="ambiente">{colaborador ? "Espaço do colaborador" : "Gestão de RH"}</span>
            <strong>Olá, {usuario.nome.split(" ")[0]}!</strong>
          </div>

          <div className="usuario-topo">
            <div className="usuario-topo-texto">
              <strong>{usuario.nome}</strong>
              <small>{colaborador ? `${usuario.pontosTotal} pontos` : usuario.empresa.nome}</small>
            </div>
            {colaborador ? (
              <button type="button" className="avatar avatar-botao" title="Meu perfil" aria-label="Abrir meu perfil" onClick={() => onNavegar("perfil")}>
                {iniciais(usuario.nome)}
              </button>
            ) : (
              <span className="avatar" aria-hidden="true">
                {iniciais(usuario.nome)}
              </span>
            )}
            <button type="button" className="botao-sair" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <main className="conteudo-principal">{children}</main>

        {colaborador && <AvisoLembretes />}
        {colaborador && <ColaboradorNav pagina={pagina} onNavegar={onNavegar} />}
      </section>
    </div>
  );
}
