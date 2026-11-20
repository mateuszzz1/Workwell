/**
 * Hook para ler a sessão em qualquer componente:
 *   const { usuario, sair } = useSessao();
 */
import { useContext } from "react";
import { SessaoContext } from "../context/sessao-context";

export function useSessao() {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return sessao;
}

/** Atalho para telas que só aparecem com alguém logado. */
export function useUsuarioLogado() {
  const { usuario } = useSessao();
  if (!usuario) throw new Error("Esta tela exige um usuário logado.");
  return usuario;
}
