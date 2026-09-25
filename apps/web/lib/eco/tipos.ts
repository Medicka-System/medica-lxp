/**
 * Tipos compartidos del chat de Eco (§7A). Viven aquí (no en el archivo `'use server'`)
 * porque un módulo de server actions solo debe EXPORTAR funciones async; los tipos los
 * consumen tanto la acción (`chat.server.ts`) como el cliente (`<ChatEco>`).
 */

export type TurnoEco = { rol: 'usuario' | 'eco'; texto: string };

export type FuenteEco = {
  tipo: string;
  id?: string | null;
  titulo?: string;
  distancia?: number;
};

export type RespuestaEco =
  | { ok: true; texto: string; fuentes: FuenteEco[]; toolsUsados: string[]; modelo: string }
  | { ok: false; error: string };
