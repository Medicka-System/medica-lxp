import { z } from 'zod';

/**
 * Contrato de respuesta de `GET /health` (api).
 * Forma definida una sola vez y reusada por `api` (respuesta) y `web` (fetch).
 */
export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().nonnegative(),
  version: z.string(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
