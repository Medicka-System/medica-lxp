'use server';

import { revalidatePath } from 'next/cache';
import { requireDocente } from './session';
import type { ResultadoAccion } from './acciones';

/**
 * Puente del DOCENTE hacia Eco (§7A · Sprint 5.3). Estas acciones NO son proxy de
 * CRUD (§2): son dominio/orquestación de IA que YA vive en `apps/api` (`src/ai`) — el
 * web solo la DISPARA y asienta el cierre humano. La LECTURA de la bandeja (pintar las
 * propuestas) va directa `web → Supabase` bajo RLS (ver `datos.ts`), no por aquí.
 *
 * Endpoints consumidos (tal como el `api` los expone hoy · el web se ajusta al api):
 *   • POST /ai/lote                      → pre-analiza un lote SÍNCRONO y devuelve el
 *                                          resumen (útil sin worker; en prod puede
 *                                          moverse a POST /ai/bandeja/:grupoId async).
 *   • POST /ai/propuestas/:id/confirmar  → cierre humano: asienta (solo entregas) y
 *                                          registra la corrección docente→Eco.
 *   • POST /ai/propuestas/:id/descartar  → cierra la propuesta sin asentar nada.
 *
 * NOTA de contrato (documentada, §13): el `api` califica en escala 0–100 y la consola
 * de entregas trabaja en 0–10. Por eso el ASIENTO de una entrada de entrega se hace en
 * el web (`calificarEntrega`, 0–10, `eco_sugerida=true`) y NO se enruta por
 * `confirmar` (evita doble escritura y el choque de escalas). Para CASOS no hay nota:
 * `confirmar` solo cierra la propuesta y captura la corrección — ahí sí lo usamos.
 *
 * NO existe (aún) endpoint conversacional / de redacción libre en `apps/api` (solo el
 * pipeline de evaluación en lote + confirmar/descartar/indexar/config). El "borrador de
 * respuesta" de consultas y el chat de Eco quedan pendientes de ese endpoint.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return (
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  );
}

export type ResumenAnalisisEco = {
  total: number;
  listos: number;
  requierenCriterio: number;
};

/**
 * Dispara el pre-análisis de Eco de un GRUPO (§7A). Modo `casos` (bitácora) o
 * `entregas` (opcionalmente acotado a una actividad). Corre el lote síncrono en el
 * `api` y revalida la ruta para que la bandeja se repinte con las propuestas.
 */
export async function analizarConEco(input: {
  grupoId: string | null;
  modo: 'casos' | 'entregas';
  /** Ancla por lección (modelo nuevo · mig 0026): preferente sobre actividadId. */
  leccionId?: string;
  actividadId?: string;
}): Promise<ResultadoAccion & { resumen?: ResumenAnalisisEco }> {
  await requireDocente();
  if (!input.grupoId) {
    return {
      ok: false,
      error: 'Este ítem no tiene grupo asociado; Eco pre-analiza por grupo.',
    };
  }
  try {
    const res = await fetch(`${apiBase()}/ai/lote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grupoId: input.grupoId,
        modo: input.modo,
        leccionId: input.leccionId,
        actividadId: input.actividadId,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `Eco no pudo analizar el lote (HTTP ${res.status}).` };
    }
    const r = (await res.json()) as {
      total: number;
      listos: number;
      requierenCriterio: number;
    };
    revalidatePath(input.modo === 'casos' ? '/docente/validacion' : '/docente/entregas');
    revalidatePath('/docente');
    return {
      ok: true,
      resumen: {
        total: r.total ?? 0,
        listos: r.listos ?? 0,
        requierenCriterio: r.requierenCriterio ?? 0,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'No se pudo contactar a Eco (apps/api). ¿Está levantada la API?',
    };
  }
}

/**
 * Cierre humano de una propuesta de Eco (§7A): confirma. Para CASOS el asiento clínico
 * lo hace `validarCaso` (flujo aparte); aquí `confirmar` solo cierra la propuesta y
 * captura la corrección docente→Eco (loop de mejora · `eco_correcciones`). Best-effort:
 * si falla, la validación clínica ya quedó asentada y no debe bloquearse por esto.
 */
export async function confirmarPropuestaEco(input: {
  propuestaId: string;
  feedback?: string | null;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    const res = await fetch(
      `${apiBase()}/ai/propuestas/${input.propuestaId}/confirmar`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ docenteId: userId, feedback: input.feedback ?? undefined }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { ok: false, error: `Eco no pudo cerrar la propuesta (HTTP ${res.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo cerrar la propuesta de Eco.' };
  }
}

/** Descarta una propuesta de Eco sin asentar nada (el docente la ignora · §7A). */
export async function descartarPropuestaEco(input: {
  propuestaId: string;
  revalidar?: '/docente/validacion' | '/docente/entregas';
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    const res = await fetch(
      `${apiBase()}/ai/propuestas/${input.propuestaId}/descartar`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ docenteId: userId }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { ok: false, error: `Eco no pudo descartar la propuesta (HTTP ${res.status}).` };
    if (input.revalidar) revalidatePath(input.revalidar);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo descartar la propuesta de Eco.' };
  }
}
