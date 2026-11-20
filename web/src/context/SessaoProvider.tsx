/**
 * Guarda o usuário logado e oferece entrar, cadastrar e sair.
 *
 * Ao abrir a página: se houver um token salvo, busca o perfil na API.
 * Se o token estiver vencido, a API responde 401 e voltamos ao login.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { definirToken, quandoSessaoExpirar, temToken } from "../services/api";
import * as workwell from "../services/workwell";
import type { Usuario } from "../types";
import { SessaoContext, type ValorSessao } from "./sessao-context";

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(temToken);

  // Login salvo: recupera o perfil ao abrir a página.
  useEffect(() => {
    quandoSessaoExpirar(() => setUsuario(null));
    if (!temToken()) return;
    workwell
      .buscarPerfil()
      .then(setUsuario)
      .catch(() => definirToken(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const sessao = await workwell.entrar(email, senha);
    definirToken(sessao.token);
    setUsuario(sessao.usuario);
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    const sessao = await workwell.cadastrar(nome, email, senha);
    definirToken(sessao.token);
    setUsuario(sessao.usuario);
  }, []);

  const sair = useCallback(() => {
    definirToken(null);
    setUsuario(null);
  }, []);

  const atualizarUsuario = useCallback(async (novo?: Usuario) => {
    setUsuario(novo ?? (await workwell.buscarPerfil()));
  }, []);

  // useMemo evita re-renderizar todas as telas quando nada mudou.
  const valor = useMemo<ValorSessao>(
    () => ({ usuario, carregando, entrar, cadastrar, sair, atualizarUsuario }),
    [usuario, carregando, entrar, cadastrar, sair, atualizarUsuario],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}
