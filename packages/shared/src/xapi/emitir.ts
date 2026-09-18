/**
 * `emitirStatement` — construye un statement xAPI VÁLIDO listo para encolar hacia
 * el LRS (§7). Es data pura: NO envía (eso lo hace el worker `envio-xapi` con
 * retry). Asigna un `id` client-side para **idempotencia**: si el worker reintenta
 * un envío, el LRS deduplica por ese id y no se crean statements duplicados.
 */
import {
  statementSchema,
  type Actividad,
  type Actor,
  type Result,
  type Statement,
  type Verbo,
} from './esquemas';

/** UUID portátil (Web Crypto en Node 20+/navegador; fallback sin dependencias). */
export function nuevoUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Construye (y valida) un statement actor–verbo–objeto, con `result` opcional.
 * @example emitirStatement(actorDeUsuario(uid), verbo('subio'), actividad('caso', casoId))
 */
export function emitirStatement(
  actor: Actor,
  verbo: Verbo,
  objeto: Actividad,
  result?: Result,
): Statement {
  const statement: Statement = {
    id: nuevoUuid(),
    actor,
    verb: verbo,
    object: objeto,
    ...(result ? { result } : {}),
    timestamp: new Date().toISOString(),
  };
  return statementSchema.parse(statement);
}
