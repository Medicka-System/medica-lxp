import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import {
  construirRuntimeScript,
  type Cmi,
} from '@/lib/scorm/runtime';
import { baseDeLanzador, construirShellHtml, inyectarBase } from '@/lib/scorm/shell';

export const dynamic = 'force-dynamic';

/**
 * Shell MISMO-ORIGEN del player SCORM (§7 · pieza que faltaba). Sirve, desde el origen de la
 * app, el `index.html` del paquete (bajado de MinIO) dentro de un `<iframe srcdoc>` + el runtime
 * (`window.API` / `window.API_1484_11`) en el `<head>` del shell → el SCO lo encuentra en
 * `window.parent` (mismo origen) sin postMessage. Los assets relativos cargan directo de MinIO
 * vía `<base>`. REANUDA sembrando el runtime con `reproduccion_progreso.estado_scorm` previo.
 *
 * NO toca el backend: reusa `GET /paquetes/:id/lanzador` (resuelve la URL pública) y el commit
 * del runtime va a `POST /scorm/commit` (web) → `POST /players/scorm/commit` (api, ya existente).
 *
 * Caveat de infra (documentado): este handler descarga el `index.html` server-side desde la URL
 * pública de MinIO (`lanzadorUrl`); el contenedor `web` debe poder alcanzar ese host (egress).
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

function paginaSimple(titulo: string, mensaje: string, status = 200): Response {
  const esc = (s: string) => s.replace(/</g, '&lt;');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:#0f2d52;color:#fff;font:600 14px/1.6 system-ui,sans-serif}p{max-width:42ch;text-align:center;padding:24px}</style>
</head><body><p>${esc(mensaje)}</p></body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ contenidoId: string }> },
): Promise<Response> {
  const { contenidoId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const entry = (searchParams.get('entry') ?? '').trim();
  const leccionId = searchParams.get('leccion');
  const titulo = searchParams.get('titulo');

  const alumno = await getSesionAlumno(); // redirige a /login si no hay sesión
  if (!alumno.accesoActivo) {
    return paginaSimple('Acceso en pausa', 'Tu acceso está en pausa. Regulariza tu pago para reanudar el contenido.', 403);
  }
  if (!entry) return paginaSimple('Paquete', 'Falta el archivo de arranque del paquete.', 400);

  // 1) URL pública del lanzador (reusa el contrato existente del api · pieza 1).
  let lanzadorUrl: string;
  try {
    const res = await fetch(
      `${apiBase()}/paquetes/${encodeURIComponent(contenidoId)}/lanzador?entry=${encodeURIComponent(entry)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return paginaSimple('Paquete', 'No se pudo resolver el lanzador del paquete.', 502);
    const d = (await res.json()) as { lanzadorUrl: string; listo: boolean };
    if (!d.listo || !d.lanzadorUrl) return paginaSimple('Preparando', 'El paquete aún se está procesando. Vuelve en un momento.');
    lanzadorUrl = d.lanzadorUrl;
  } catch {
    return paginaSimple('Paquete', 'No se pudo contactar el servicio de paquetes.', 502);
  }

  // 2) Baja el index.html desde MinIO (público). Los assets relativos los cargará el navegador
  //    directo del storage vía <base> (no se proxyan aquí).
  let indexHtml: string;
  try {
    const res = await fetch(lanzadorUrl, { cache: 'no-store' });
    if (!res.ok) return paginaSimple('Paquete', 'No se pudo descargar el contenido del paquete.', 502);
    indexHtml = await res.text();
  } catch {
    return paginaSimple('Paquete', 'No se pudo descargar el contenido del paquete.', 502);
  }

  // 3) READ-BACK: CMI previo del alumno para reanudar (suspend_data/lesson_location/score…).
  let cmiPrevio: Cmi = {};
  try {
    const filas = await comoAlumno(alumno.userId, (sql) =>
      sql<{ estado_scorm: Cmi | null }[]>`
        select estado_scorm from lxp.reproduccion_progreso
        where alumno_id = ${alumno.userId} and contenido_id = ${contenidoId} limit 1`,
    );
    const prev = filas[0]?.estado_scorm;
    if (prev && typeof prev === 'object') cmiPrevio = prev;
  } catch {
    /* sin estado previo → arranca limpio */
  }

  // 4) Arma el shell (runtime + SCO en srcdoc, base → MinIO) y lo sirve mismo-origen.
  const runtimeScript = construirRuntimeScript({
    commitUrl: '/scorm/commit',
    contenidoId,
    leccionId: leccionId && leccionId.length ? leccionId : null,
    titulo: titulo && titulo.length ? titulo : null,
    cmiPrevio,
  });
  const indexHtmlConBase = inyectarBase(indexHtml, baseDeLanzador(lanzadorUrl));
  const html = construirShellHtml({ runtimeScript, indexHtmlConBase, titulo: titulo || 'Paquete SCORM' });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
