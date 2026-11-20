/**
 * Aviso de lembrete (UC09) que aparece em qualquer página do colaborador.
 *
 * A cada 30 segundos pergunta à API quais lembretes devem aparecer agora.
 * O colaborador pode dispensar o aviso ou adiar por 10 minutos
 * (Lembrete.adiar() do diagrama de classes).
 */
import { useEffect, useRef, useState } from "react";
import { adiarLembrete, buscarLembretesPendentes, dispensarLembrete } from "../../services/workwell";
import type { LembretePendente } from "../../types";

const INTERVALO = 30_000;
const MINUTOS_ADIAR = 10;

export function AvisoLembretes() {
  const [avisos, setAvisos] = useState<LembretePendente[]>([]);
  // Avisos já mostrados neste minuto, para não repetir a cada consulta.
  const exibidos = useRef(new Set<string>());

  useEffect(() => {
    let ativo = true;

    async function verificar() {
      try {
        const pendentes = await buscarLembretesPendentes();
        if (!ativo) return;
        // Chave: id + horário (ou momento do adiamento). Cada ocorrência aparece uma vez.
        const novos = pendentes.filter((aviso) => !exibidos.current.has(`${aviso.id}-${aviso.adiadoAte ?? aviso.horario}`));
        for (const aviso of novos) exibidos.current.add(`${aviso.id}-${aviso.adiadoAte ?? aviso.horario}`);
        if (novos.length) setAvisos((atuais) => [...atuais, ...novos]);
      } catch {
        /* falha momentânea de rede: tenta de novo na próxima rodada */
      }
    }

    void verificar();
    const intervalo = window.setInterval(verificar, INTERVALO);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  /** Remove o aviso da tela e avisa a API (dispensar ou adiar). */
  async function responder(aviso: LembretePendente, acao: "dispensar" | "adiar") {
    setAvisos((atuais) => atuais.filter((item) => item.id !== aviso.id));
    try {
      if (acao === "adiar") await adiarLembrete(aviso.id, MINUTOS_ADIAR);
      else await dispensarLembrete(aviso.id);
    } catch {
      /* se falhar, o lembrete simplesmente volta no próximo horário */
    }
  }

  if (avisos.length === 0) return null;

  return (
    <div className="avisos-lembrete" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={`${aviso.id}-${aviso.adiadoAte ?? aviso.horario}`} className="aviso-lembrete">
          <p>{aviso.mensagem}</p>
          <div className="botoes-linha">
            <button type="button" className="botao-secundario" onClick={() => responder(aviso, "adiar")}>
              Adiar {MINUTOS_ADIAR} min
            </button>
            <button type="button" className="botao-primario" onClick={() => responder(aviso, "dispensar")}>
              Ok
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
