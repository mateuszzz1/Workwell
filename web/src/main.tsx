/**
 * Ponto de entrada do React: monta o <App /> dentro da <div id="root"> do index.html.
 * O SessaoProvider envolve tudo para que qualquer tela saiba quem está logado.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SessaoProvider } from "./context/SessaoProvider.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessaoProvider>
      <App />
    </SessaoProvider>
  </StrictMode>,
);
