'use client';

import { useEffect } from 'react';
import {
  X,
  Video,
  FileText,
  Boxes,
  Activity,
  Volume2,
  Maximize2,
  Play,
} from 'lucide-react';
import { mono } from '@/components/tokens';
import type { TipoContenido } from '../_lib/datos';

/**
 * Reproductor de contenido (§3, §7) — pieza reusable para la Videoteca y, a futuro,
 * para embeber en la pantalla de **lección**. Cambia de superficie según el `tipo`:
 *
 *  - `video`        → player de video (Cloudflare Stream / object storage).
 *  - `h5p`          → iframe del H5P self-host (`@lumieducation/h5p-server`); emite xAPI.
 *  - `scorm`        → player SCORM que captura progreso.
 *  - `xapi`         → paquete xAPI (Articulate) que reporta al LRS.
 *  - documento      → visor embebido de PDF/Word/PPT (por extensión de `recursoRef`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PENDIENTE DE API (Sprint 6 · lo provee `apps/api` + `apps/worker`). Contrato:
 *
 *  1) URL firmada de media   GET  /media/url?ref=<recursoRef>
 *                            → { url: string; expiraEn: string }   (object storage/Stream)
 *  2) Sesión H5P             GET  /h5p/play/<contentId>            (iframe; emite xAPI al LRS)
 *  3) Player SCORM           GET  /scorm/play/<paqueteId>          (iframe; postMessage de progreso)
 *  4) xAPI (Articulate)      el paquete reporta al LRS vía cola `envio-xapi`
 *
 * Mientras el endpoint no exista, se muestra el marco del contenido + un aviso claro
 * del tipo de reproducción y del contrato que lo habilita. No se inventa la reproducción.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ContenidoReproducible = {
  id: string;
  titulo: string;
  tipo: TipoContenido;
  recursoRef: string | null;
  /** Migaja de contexto: "Programa · Módulo · Lección". */
  contexto?: string;
};

const EXT_DOC = /\.(pdf|docx?|pptx?)$/i;

function esDocumento(ref: string | null): boolean {
  return !!ref && EXT_DOC.test(ref);
}

/** Etiqueta legible del tipo de reproducción (para el aviso PENDIENTE). */
function detalleTipo(c: ContenidoReproducible): { icono: typeof Video; texto: string } {
  if (esDocumento(c.recursoRef)) {
    return { icono: FileText, texto: 'Documento (PDF/Word/PPT) — visor embebido con URL firmada.' };
  }
  switch (c.tipo) {
    case 'h5p':
      return { icono: Boxes, texto: 'Interactivo H5P — se sirve del H5P self-host y emite xAPI al LRS.' };
    case 'scorm':
      return { icono: Boxes, texto: 'Paquete SCORM — se reproduce en su player y captura progreso.' };
    case 'xapi':
      return { icono: Activity, texto: 'Paquete xAPI (Articulate) — reporta actividad al LRS.' };
    case 'video':
    default:
      return { icono: Video, texto: 'Video instruccional — se sirve por URL firmada (Cloudflare Stream / object storage).' };
  }
}

export function Reproductor({
  contenido,
  onCerrar,
}: {
  contenido: ContenidoReproducible;
  onCerrar: () => void;
}) {
  // Cerrar con Escape (accesibilidad).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  const { icono: Icono, texto } = detalleTipo(contenido);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reproducir · ${contenido.titulo}`}
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(15,45,82,0.7)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[880px] overflow-hidden rounded-2xl border border-border bg-card shadow-rest"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Marco de reproducción 16:9 (superficie del contenido). */}
        <div className="relative grid w-full place-items-center bg-[color:var(--sidebar)]" style={{ aspectRatio: '16 / 9' }}>
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
          />
          <span aria-hidden className="relative grid h-[60px] w-[60px] place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
            <Play className="h-6 w-6" strokeWidth={2} />
          </span>
          <span
            className={`${mono} absolute bottom-3 left-3 max-w-[80%] truncate text-[10.5px] uppercase tracking-[0.14em]`}
            style={{ color: 'var(--hero-ink-muted)' }}
          >
            {contenido.recursoRef ?? 'sin recurso vinculado'}
          </span>

          {/* Barra de controles simulada (la real llega con la URL firmada). */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 pt-8"
            style={{ background: 'linear-gradient(to top, rgba(15,45,82,.92), rgba(15,45,82,0))' }}
          >
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
              <Play className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className={`${mono} text-[12px]`} style={{ color: 'var(--hero-ink)' }}>
              0:00
            </span>
            <Volume2 aria-hidden className="h-[18px] w-[18px]" style={{ color: 'var(--hero-ink-soft)' }} strokeWidth={1.75} />
            <Maximize2 aria-hidden className="ml-auto h-[18px] w-[18px]" style={{ color: 'var(--hero-ink-soft)' }} strokeWidth={1.75} />
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el reproductor"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        {/* Cabecera del contenido. */}
        <div className="border-t border-border px-5 py-4">
          <p className="text-[15px] font-bold leading-snug">{contenido.titulo}</p>
          {contenido.contexto && (
            <p className="mt-1 text-[12px] text-muted-foreground">{contenido.contexto}</p>
          )}
        </div>

        {/* Aviso PENDIENTE DE API — describe la reproducción real que habilita el contrato. */}
        <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
          <Icono aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            {texto}{' '}
            <span className="font-bold">Reproducción pendiente de API</span> (URL firmada del
            servicio de media · Sprint 6).
          </p>
        </div>
      </div>
    </div>
  );
}
