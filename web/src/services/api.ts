type ApiError = { erro?: string };

export async function api<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...opcoes?.headers,
    },
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as ApiError;
    throw new Error(corpo.erro ?? "Não foi possível concluir a operação.");
  }

  return resposta.json() as Promise<T>;
}
