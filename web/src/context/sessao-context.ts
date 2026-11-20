/**
 * Contexto da sessão: deixa o usuário logado disponível para qualquer tela,
 * sem precisar passar por props de componente em componente.
 *
 * O componente que fornece os dados é o SessaoProvider; as telas leem com
 * o hook useSessao().
 */
import { createContext } from "react";
import type { Usuario } from "../types";

export type ValorSessao = {
  /** Usuário logado, ou `null` se ninguém entrou. */
  usuario: Usuario | null;
  /** `true` enquanto confere se há um login salvo (ao abrir a página). */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => void;
  /** Troca o usuário em memória (ex.: após o onboarding) ou recarrega da API. */
  atualizarUsuario: (usuario?: Usuario) => Promise<void>;
};

export const SessaoContext = createContext<ValorSessao | null>(null);
