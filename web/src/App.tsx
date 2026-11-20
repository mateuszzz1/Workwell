/**
 * Componente raiz: decide qual tela mostrar.
 *
 *   ninguém logado                      -> tela de acesso (login / cadastro)
 *   colaborador sem onboarding          -> onboarding
 *   colaborador                         -> check-in, hábitos, progresso, lembretes, desafios, perfil
 *   gestor de RH                        -> painel organizacional, desafios
 *
 * A navegação é um simples estado (`pagina`), sem biblioteca de rotas,
 * para manter o projeto fácil de entender.
 */
import { useState } from "react";
import { AppLayout, type Pagina } from "./components/layout/AppLayout";
import { useSessao } from "./hooks/useSessao";
import { AcessoPage } from "./pages/acesso/AcessoPage";
import { OnboardingPage } from "./pages/acesso/OnboardingPage";
import { DesafiosPage } from "./pages/colaborador/DesafiosPage";
import { HabitosPage } from "./pages/colaborador/HabitosPage";
import { InicioPage } from "./pages/colaborador/InicioPage";
import { PerfilPage } from "./pages/colaborador/PerfilPage";
import { LembretesPage } from "./pages/colaborador/LembretesPage";
import { ProgressoPage } from "./pages/colaborador/ProgressoPage";
import { DesafiosRhPage } from "./pages/rh/DesafiosRhPage";
import { PainelRhPage } from "./pages/rh/PainelRhPage";
import "./styles/app.css";
import "./styles/telas.css";

const PAGINAS_RH: Pagina[] = ["painel", "desafios"];

export default function App() {
  const { usuario, carregando } = useSessao();
  // A página escolhida fica junto com o id de quem a escolheu: ao trocar de
  // conta, a navegação recomeça na página inicial do novo perfil.
  const [navegacao, setNavegacao] = useState<{ usuarioId: number | null; pagina: Pagina }>({ usuarioId: null, pagina: "inicio" });

  if (carregando) {
    return <div className="estado-pagina">Preparando sua experiência...</div>;
  }

  if (!usuario) {
    return <AcessoPage />;
  }

  if (usuario.perfil === "COLABORADOR" && !usuario.onboardingConcluido) {
    return <OnboardingPage />;
  }

  const paginaInicial: Pagina = usuario.perfil === "GESTOR_RH" ? "painel" : "inicio";
  const setPagina = (pagina: Pagina) => setNavegacao({ usuarioId: usuario.id, pagina });

  // Página atual: a escolhida por este usuário, ou a inicial do perfil.
  // Também garante que cada perfil só veja as próprias páginas.
  let paginaAtual = navegacao.usuarioId === usuario.id ? navegacao.pagina : paginaInicial;
  if (usuario.perfil === "GESTOR_RH" && !PAGINAS_RH.includes(paginaAtual)) paginaAtual = "painel";
  if (usuario.perfil === "COLABORADOR" && paginaAtual === "painel") paginaAtual = "inicio";

  return (
    <AppLayout pagina={paginaAtual} onNavegar={setPagina}>
      {paginaAtual === "inicio" && <InicioPage onVerProgresso={() => setPagina("progresso")} />}
      {paginaAtual === "progresso" && <ProgressoPage />}
      {paginaAtual === "lembretes" && <LembretesPage />}
      {paginaAtual === "perfil" && <PerfilPage />}
      {paginaAtual === "habitos" && <HabitosPage key={usuario.id} />}
      {paginaAtual === "desafios" && (usuario.perfil === "GESTOR_RH" ? <DesafiosRhPage /> : <DesafiosPage />)}
      {paginaAtual === "painel" && <PainelRhPage />}
    </AppLayout>
  );
}
