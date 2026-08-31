import { z } from "zod";

export const gestorIdParamsSchema = z.object({
  gestorId: z.coerce.number().int().positive(),
});
