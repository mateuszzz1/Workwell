/**
 * Validações (Zod) reaproveitadas por vários módulos.
 */
import { z } from "zod";

/** Data no formato "AAAA-MM-DD" que realmente exista no calendário (rejeita 2026-02-31). */
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((valor) => {
    const data = new Date(`${valor}T00:00:00Z`);
    return (
      !Number.isNaN(data.getTime()) &&
      data.toISOString().slice(0, 10) === valor &&
      valor >= "2000-01-01" &&
      valor <= "2100-12-31"
    );
  }, "Informe uma data válida.");

/** Parâmetro `:id` da URL, convertido para número inteiro positivo. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
