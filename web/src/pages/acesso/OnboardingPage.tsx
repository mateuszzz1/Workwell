/**
 * Onboarding guiado (UC03), em 3 passos:
 *   1. perfil (setor e cargo);
 *   2. hábitos iniciais (opcional);
 *   3. privacidade e notificações, com a confirmação final.
 *
 * Ao concluir, a API marca `onboardingConcluido` e o App libera as telas.
 */
import { useState } from "react";
import { HabitoIcone } from "../../components/habitos/HabitoIcone";
import { useCarregar } from "../../hooks/useCarregar";
import { useSessao, useUsuarioLogado } from "../../hooks/useSessao";
import { buscarOpcoesOnboarding, concluirOnboarding } from "../../services/workwell";
import type { IconeHabito } from "../../types/habitos";

const TOTAL_PASSOS = 3;

export function OnboardingPage() {
  const usuario = useUsuarioLogado();
  const { atualizarUsuario, sair } = useSessao();
  const { dados: opcoes, erro: erroOpcoes } = useCarregar(buscarOpcoesOnboarding);

  const [passo, setPasso] = useState(1);
  const [setor, setSetor] = useState(usuario.setor ?? "");
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [habitos, setHabitos] = useState<string[]>([]);
  const [notificacoes, setNotificacoes] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarHabito(icone: string) {
    setHabitos((atuais) => (atuais.includes(icone) ? atuais.filter((item) => item !== icone) : [...atuais, icone]));
  }

  async function concluir() {
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await concluirOnboarding({
        nome: usuario.nome,
        cargo: cargo.trim() || null,
        setor,
        prefNotificacao: notificacoes,
        habitosIniciais: habitos,
      });
      await atualizarUsuario(atualizado);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir.");
      setSalvando(false);
    }
  }

  if (erroOpcoes) return <div className="estado-pagina estado-erro">{erroOpcoes}</div>;
  if (!opcoes) return <div className="estado-pagina">Carregando...</div>;

  return (
    <div className="acesso-pagina">
      <section className="acesso-cartao onboarding-cartao fade-in">
        <span className="eyebrow">
          Passo {passo} de {TOTAL_PASSOS}
        </span>
        <div className="onboarding-progresso" aria-hidden="true">
          <span style={{ width: `${(passo / TOTAL_PASSOS) * 100}%` }} />
        </div>

        {passo === 1 && (
          <>
            <h1>Olá, {usuario.nome.split(" ")[0]}! Vamos começar.</h1>
            <p className="acesso-subtitulo">Conte um pouco sobre você. Leva menos de um minuto.</p>
            <div className="formulario">
              <label className="campo">
                <span>Seu setor</span>
                <select value={setor} onChange={(e) => setSetor(e.target.value)}>
                  <option value="">Selecione...</option>
                  {opcoes.setores.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>
                  Cargo <small>(opcional)</small>
                </span>
                <input value={cargo} maxLength={80} onChange={(e) => setCargo(e.target.value)} />
              </label>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1>Quais hábitos você quer cultivar?</h1>
            <p className="acesso-subtitulo">
              Toque nos cartões para escolher. Exemplo: “Beber água” cria a meta de 8 copos por dia. Você pode escolher
              nenhum, um ou vários e ajustar tudo depois em Metas e hábitos.
            </p>
            <div className="opcoes-habitos">
              {opcoes.habitosSugeridos.map((habito) => (
                <button
                  key={habito.icone}
                  type="button"
                  className={habitos.includes(habito.icone) ? "selecionado" : ""}
                  aria-pressed={habitos.includes(habito.icone)}
                  onClick={() => alternarHabito(habito.icone)}
                >
                  <HabitoIcone icone={habito.icone as IconeHabito} />
                  <strong>{habito.nome}</strong>
                  <small>
                    {habito.meta} {habito.unidade} por dia
                  </small>
                </button>
              ))}
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1>Sua privacidade em primeiro lugar</h1>
            <ul className="lista-privacidade">
              <li>Seus check-ins e hábitos são visíveis somente para você.</li>
              <li>O RH vê apenas médias de grupos com 5 ou mais pessoas, nunca seu nome.</li>
              <li>Você ganha pontos e medalhas ao cuidar da sua rotina.</li>
            </ul>
            <label className="campo-checkbox">
              <input type="checkbox" checked={notificacoes} onChange={(e) => setNotificacoes(e.target.checked)} />
              Quero receber lembretes dentro da plataforma
            </label>
          </>
        )}

        {erro && (
          <div className="feedback erro" role="alert">
            {erro}
          </div>
        )}

        <div className="onboarding-acoes">
          {passo > 1 ? (
            <button type="button" className="botao-secundario" onClick={() => setPasso(passo - 1)}>
              Voltar
            </button>
          ) : (
            <button type="button" className="botao-secundario" onClick={sair}>
              Sair
            </button>
          )}
          {passo < TOTAL_PASSOS ? (
            <button type="button" className="botao-primario" disabled={passo === 1 && !setor} onClick={() => setPasso(passo + 1)}>
              {passo === 2 && habitos.length === 0 ? "Pular esta etapa" : "Continuar"}
            </button>
          ) : (
            <button type="button" className="botao-primario" disabled={salvando} onClick={concluir}>
              {salvando ? "Salvando..." : "Começar a usar"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
