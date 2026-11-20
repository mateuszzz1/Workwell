/**
 * Validações do módulo de usuários (perfil e onboarding).
 */
import { z } from "zod";

/**
 * Setores disponíveis. Uma lista fechada evita que "TI", "Ti" e "Tecnologia"
 * virem três grupos diferentes no painel do RH.
 */
export const SETORES = ["Tecnologia", "Financeiro", "Operações", "Comercial", "Pessoas"] as const;

/** Hábitos que o colaborador pode escolher no onboarding. */
export const HABITOS_SUGERIDOS = ["water", "coffee", "exercise", "sleep", "meditation"] as const;

/** UC01 - Configurar perfil. */
export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.string().trim().max(80).nullable(),
  setor: z.enum(SETORES, "Escolha um setor da lista."),
  prefNotificacao: z.boolean(),
});

/** UC03 - Onboarding: perfil + hábitos iniciais (opcionais). */
export const onboardingSchema = perfilSchema.extend({
  habitosIniciais: z.array(z.enum(HABITOS_SUGERIDOS)).max(HABITOS_SUGERIDOS.length).default([]),
});

export type PerfilInput = z.infer<typeof perfilSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
