import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  criadoEm: string;
};

export default function App() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      const res = await fetch("/api/usuarios");
      if (!res.ok) throw new Error("Falha ao carregar");
      setUsuarios(await res.json());
      setErro(null);
    } catch (e) {
      setErro("Não foi possível carregar os usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (!nome || !email) return;
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email }),
    });
    if (res.ok) {
      setNome("");
      setEmail("");
      carregar();
    } else {
      setErro("Não foi possível criar o usuário.");
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Workwell</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={criar}>Adicionar</button>
      </div>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
      {carregando && <p>Carregando…</p>}

      <ul>
        {usuarios.map((u) => (
          <li key={u.id}>
            <strong>{u.nome}</strong> — {u.email}
          </li>
        ))}
      </ul>
    </div>
  );
}