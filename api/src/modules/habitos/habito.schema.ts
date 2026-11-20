/**
 * Validações dos hábitos (criar/editar, registrar progresso e importar dados antigos).
 */
import { z } from "zod";
import { dataSchema } from "../../utils/validacao.js";

/** Ícone também define a categoria do hábito. */
export const iconeSchema = z.enum(["water", "sleep", "exercise", "coffee", "meditation", "custom"]);

const horarioSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use um horário válido (HH:mm).");

/** Unidades aceitas por categoria (ex.: água só em copos). */
const UNIDADES_POR_ICONE: Record<z.infer<typeof iconeSchema>, string[]> = {
  water: ["copos"],
  sleep: ["registro", "horas"],
  exercise: ["min", "vezes"],
  coffee: ["pausas", "min"],
  meditation: ["min"],
  custom: ["copos", "min", "horas", "pausas", "registro", "vezes"],
};

/** UC05 - Configuração de um hábito. */
export const habitoSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do hábito.").max(60, "Use no máximo 60 caracteres."),
    icone: iconeSchema,
    meta: z.number().int().min(1, "A meta deve ser maior que zero.").max(1000, "A meta máxima é 1.000."),
    unidade: z.enum(["copos", "min", "horas", "pausas", "registro", "vezes"]),
    frequencia: z.enum(["DIARIA", "DIAS_ESPECIFICOS", "SEMANAL"]),
    diasSemana: z.array(z.number().int().min(0).max(6)).max(7),
    quantidadeSemanal: z.number().int().min(1).max(7).nullable(),
    permitirPausa: z.boolean(),
    lembretesAtivos: z.boolean(),
    horarios: z.array(horarioSchema).max(8),
  })
  .strict() // rejeita campos extras (ex.: alguém tentando enviar "usuarioId")
  .superRefine((dados, ctx) => {
    // Regras que envolvem mais de um campo ao mesmo tempo:
    const erro = (campo: string, message: string) => ctx.addIssue({ code: "custom", path: [campo], message });

    if (!UNIDADES_POR_ICONE[dados.icone].includes(dados.unidade))
      erro("unidade", "Escolha uma unidade compatível com a categoria.");
    if (dados.frequencia === "DIAS_ESPECIFICOS" && dados.diasSemana.length === 0)
      erro("diasSemana", "Escolha pelo menos um dia.");
    if (new Set(dados.diasSemana).size !== dados.diasSemana.length) erro("diasSemana", "Os dias não podem se repetir.");
    if (dados.frequencia === "SEMANAL" && !dados.quantidadeSemanal)
      erro("quantidadeSemanal", "Informe de 1 a 7 dias por semana.");
    if (new Set(dados.horarios).size !== dados.horarios.length) erro("horarios", "Os horários não podem se repetir.");
    if (dados.lembretesAtivos && dados.horarios.length === 0)
      erro("horarios", "Adicione pelo menos um horário ou desative os lembretes.");
  });

/** `?data=AAAA-MM-DD` opcional nas consultas. */
export const consultaSchema = z.object({ data: dataSchema.optional() });

/** UC06 - Registrar o progresso de um hábito em um dia. */
export const registroSchema = z
  .object({
    data: dataSchema,
    valor: z.number().int().min(0).max(1000),
    pausado: z.boolean(),
    avaliacaoSono: z.number().int().min(1).max(5).nullable().optional(),
    lembretesAtivos: z.boolean().optional(),
  })
  .strict();

/** Hábito no formato antigo, salvo apenas no navegador (localStorage). */
const habitoLegado = z
  .object({
    id: z.string().min(1).max(80),
    nome: z.string().trim().min(1).max(60),
    icone: iconeSchema,
    valor: z.number().int().min(0).max(1000),
    meta: z.number().int().min(1).max(1000),
    unidade: z.string().max(20),
    concluido: z.boolean(),
  })
  .strict()
  .refine((habito) => habito.valor <= habito.meta, "Progresso inválido.");

/** Importação única dos hábitos antigos do navegador para o banco. */
export const importacaoSchema = z
  .object({
    registros: z
      .array(z.object({ data: dataSchema, habitos: z.array(habitoLegado).min(1).max(30) }).strict())
      .min(1)
      .max(10),
  })
  .strict();

export type HabitoInput = z.infer<typeof habitoSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type ImportacaoInput = z.infer<typeof importacaoSchema>;
