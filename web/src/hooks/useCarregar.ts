/**
 * Hook genérico para buscar dados da API ao abrir uma tela.
 *
 *   const { dados, erro, recarregar } = useCarregar(buscarGamificacao);
 *
 * - `dados`: resultado (ou `null` enquanto carrega);
 * - `erro`: mensagem de erro, se a chamada falhar;
 * - `recarregar()`: busca de novo (ex.: depois de salvar algo).
 *
 * A variável `ativo` ignora respostas que chegam depois que a tela foi
 * fechada, evitando atualizar um componente que não existe mais.
 */
import { useCallback, useEffect, useState } from "react";

export function useCarregar<T>(buscar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscar()
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
        setErro(null);
      })
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível carregar os dados.");
      });
    return () => {
      ativo = false;
    };
  }, [buscar, versao]);

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);
  return { dados, erro, recarregar };
}
