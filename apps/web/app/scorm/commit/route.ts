import { getSesionAlumno } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Puente de COMMIT del runtime SCORM (§7). El runtime (navegador, en el shell mismo-origen)
 * postea aquí el CMI acumulado; este handler pone el `alumnoId` DESDE LA SESIÓN (nunca del
 * cliente) y reenvía a `POST /players/scorm/commit` del `api` (que YA interpreta el CMI y
 * persiste en `lxp.reproduccion_progreso` + emite xAPI). NO se toca ese backend.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export async function POST(request: Request): Promise<Response> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return Response.json({ ok: false, error: 'acceso en pausa' }, { status: 403 });

  let body: { contenidoId?: unknown; leccionId?: unknown; cmi?: unknown; titulo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: 'json inválido' }, { status: 400 });
  }
  if (typeof body.contenidoId !== 'string' || !body.cmi || typeof body.cmi !== 'object') {
    return Response.json({ ok: false, error: 'contenidoId/cmi requeridos' }, { status: 400 });
  }

  try {
    const res = await fetch(`${apiBase()}/players/scorm/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alumnoId: alumno.userId, // de la sesión, no del cliente
        contenidoId: body.contenidoId,
        ...(typeof body.leccionId === 'string' ? { leccionId: body.leccionId } : {}),
        cmi: body.cmi,
        ...(typeof body.titulo === 'string' ? { titulo: body.titulo } : {}),
      }),
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ ok: false, error: `api ${res.status}` }, { status: 502 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[scorm/commit] fallo:', e);
    return Response.json({ ok: false, error: 'no se pudo contactar el api' }, { status: 502 });
  }
}
