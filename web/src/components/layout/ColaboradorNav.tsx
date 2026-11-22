/**
 * Barra de navegação inferior (aparece no celular), com as páginas do colaborador
 * ou, para o RH, o painel e os desafios.
 */
import { Bell, CalendarDays, ChartColumn, Clock, House, UsersRound, type LucideIcon } from "lucide-react";
import type { Pagina } from "./AppLayout";

const ITENS: Array<{ pagina: Pagina; rotulo: string; Icone: LucideIcon }> = [
  { pagina: "inicio", rotulo: "Início", Icone: House },
  { pagina: "habitos", rotulo: "Hábitos", Icone: CalendarDays },
  { pagina: "progresso", rotulo: "Progresso", Icone: Clock },
  { pagina: "lembretes", rotulo: "Lembretes", Icone: Bell },
  { pagina: "desafios", rotulo: "Desafios", Icone: UsersRound },
];

const ITENS_RH: typeof ITENS = [
  { pagina: "painel", rotulo: "Painel", Icone: ChartColumn },
  { pagina: "desafios", rotulo: "Desafios", Icone: UsersRound },
];

type ColaboradorNavProps = { pagina: Pagina; onNavegar: (pagina: Pagina) => void; rh?: boolean };

export function ColaboradorNav({ pagina, onNavegar, rh = false }: ColaboradorNavProps) {
  return (
    <nav className="colaborador-nav" aria-label={rh ? "Navegação do RH" : "Navegação do colaborador"}>
      {(rh ? ITENS_RH : ITENS).map(({ pagina: destino, rotulo, Icone }) => (
        <button
          key={destino}
          type="button"
          className={pagina === destino ? "ativo" : ""}
          aria-current={pagina === destino ? "page" : undefined}
          onClick={() => onNavegar(destino)}
        >
          <Icone size={22} strokeWidth={1.5} aria-hidden="true" focusable="false" />
          <span>{rotulo}</span>
        </button>
      ))}
    </nav>
  );
}
