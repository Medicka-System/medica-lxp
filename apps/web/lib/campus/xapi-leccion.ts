import 'server-only';
import { actividad, actorDeUsuario, emitirStatement, verbo } from '@campus/shared';

/**
 * Emisión de statements xAPI de una LECCIÓN hacia el LRS (§7), compartida por las
 * acciones del alumno (marcar completada, ver video…). Es un puente al DOMINIO (POST
 * /xapi/statements → cola `envio-xapi` en el api · §2/§8), no proxy de CRUD.
 *
 * Best-effort: la telemetría NO debe bloquear la experiencia; si el api/LRS no responde
 * se registra y se sigue. La idempotencia la da el `id` del statement (dedup en el LRS).
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export async function emitirEventoLeccion(
  userId: string,
  nombre: string,
  leccionId: string,
  tituloLeccion: string,
  clave: 'experimento' | 'completo',
): Promise<void> {
  try {
    const statement = emitirStatement(
      actorDeUsuario(userId, nombre),
      verbo(clave),
      actividad('leccion', leccionId, tituloLeccion),
      clave === 'completo' ? { completion: true } : undefined,
    );
    const res = await fetch(`${apiBase()}/xapi/statements`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(statement),
      cache: 'no-store',
    });
    if (!res.ok) console.error(`[xapi ${clave}] el api respondió HTTP ${res.status}`);
  } catch (e) {
    console.error(`[xapi ${clave}] no se pudo encolar:`, e);
  }
}
