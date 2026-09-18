'use client';

/**
 * Bloque xAPI / SCORM (§3 · §7 · §9 · §5B) — subir un paquete empaquetado (.zip exportado
 * de Articulate Rise/Storyline) y reproducirlo. El diseñador lo sube (modo `editar`); el
 * alumno lo reproduce (modo `ver`).
 *
 * Regla de Oro (§2 · §7 · §9): la descompresión (adm-zip) y el parseo del manifiesto
 * (fast-xml-parser: `imsmanifest.xml` para SCORM, `tincan.xml` para xAPI) ocurren en
 * `apps/api` + `apps/worker` (cola de ingesta). El lanzador se sirve desde la API y se
 * embebe en iframe: SCORM captura progreso (postMessage) y xAPI reporta al LRS. Este bloque
 * NO descomprime ni valida — solo selecciona el archivo, delega la subida por contrato y
 * embebe el lanzador. La firma del webhook/subida y el sandbox del iframe son del dominio.
 */

import { useRef, useState } from 'react';
import { Boxes, FileArchive, Loader2, Play, TriangleAlert, Upload, X } from 'lucide-react';
import { mono, softText, card, focusRing } from '@/components/tokens';
import type { PaqueteContenido, TipoPaquete } from '@/components/bloques/contratos';

const ROTULO_TIPO: Record<TipoPaquete, string> = {
  scorm12: 'SCORM 1.2',
  scorm2004: 'SCORM 2004',
  xapi: 'xAPI (Tin Can)',
};

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type BloquePaqueteProps = {
  /** `ver` (alumno reproduce) | `editar` (diseñador sube). */
  modo?: 'ver' | 'editar';
  /** Estado del paquete (lo actualiza la API tras la ingesta). */
  paquete?: PaqueteContenido;
  titulo?: string;
  contexto?: string;
  /**
   * Sube el .zip elegido (POST /paquetes → cola de ingesta). PENDIENTE DE API: si no se
   * inyecta, el botón queda deshabilitado con el aviso del contrato.
   */
  onSubir?: (archivo: File) => void;
};

export function BloquePaquete({ modo = 'ver', paquete, titulo, contexto, onSubir }: BloquePaqueteProps) {
  const editable = modo === 'editar';
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const estado = paquete?.estado ?? 'sin_subir';
  const tipo = paquete?.tipo;

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f && /\.zip$/i.test(f.name) ? f : null);
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <Boxes className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          {(titulo || paquete?.titulo) && (
            <span className="block truncate text-[14px] font-bold leading-snug">{titulo ?? paquete?.titulo}</span>
          )}
          {contexto && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contexto}</span>}
        </span>
        {tipo && (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-[11px] font-bold text-muted-foreground">
            {ROTULO_TIPO[tipo]}
          </span>
        )}
      </div>

      {/* Reproducción cuando el paquete está listo */}
      {estado === 'listo' && paquete?.lanzadorUrl ? (
        <ReproductorPaquete url={paquete.lanzadorUrl} tipo={tipo} titulo={titulo ?? paquete.titulo} />
      ) : estado === 'procesando' ? (
        <EstadoProcesando />
      ) : estado === 'error' ? (
        <EstadoError mensaje={paquete?.error} />
      ) : editable ? (
        <ZonaSubida
          inputRef={inputRef}
          archivo={archivo}
          onElegir={elegir}
          onLimpiar={() => {
            setArchivo(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          onSubir={onSubir}
        />
      ) : (
        <PendienteReproduccion />
      )}
    </div>
  );
}

/* ───────────────────────── Subida (diseñador) ───────────────────────── */

function ZonaSubida({
  inputRef,
  archivo,
  onElegir,
  onLimpiar,
  onSubir,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  archivo: File | null;
  onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLimpiar: () => void;
  onSubir?: (archivo: File) => void;
}) {
  return (
    <div className="px-5 py-5">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-6 py-8 text-center transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
      >
        <input ref={inputRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={onElegir} />
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
          <FileArchive className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <span className="text-[13.5px] font-bold">Elige el paquete .zip (SCORM o xAPI)</span>
        <span className={`text-[12px] leading-relaxed ${softText}`}>
          Exportado de Articulate Rise / Storyline. Se sube y la API lo descomprime y valida el manifiesto.
        </span>
      </label>

      {archivo && (
        <div className="mt-3 flex items-center gap-3 rounded-[10px] border border-border bg-card px-3.5 py-3">
          <FileArchive aria-hidden className="h-5 w-5 shrink-0 text-secondary" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{archivo.name}</span>
            <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>{pesoLegible(archivo.size)}</span>
          </span>
          <button
            type="button"
            onClick={onLimpiar}
            aria-label="Quitar archivo"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive ${focusRing}`}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2.5">
        <button
          type="button"
          disabled={!archivo || !onSubir}
          title={!onSubir ? 'Subida pendiente de API (POST /paquetes)' : undefined}
          onClick={() => archivo && onSubir?.(archivo)}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
          Subir paquete
        </button>
      </div>

      {!onSubir && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3">
          <Upload aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.9} />
          <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            La subida, descompresión (adm-zip) y validación del manifiesto (fast-xml-parser) son del dominio —{' '}
            <span className="font-bold">pendiente de API</span> (POST /paquetes → cola de ingesta).
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Reproductor (iframe del lanzador) ───────────────────────── */

function ReproductorPaquete({ url, tipo, titulo }: { url: string; tipo?: TipoPaquete; titulo?: string }) {
  return (
    <div>
      <div className="w-full bg-[color:var(--sidebar)]">
        <iframe
          src={url}
          title={titulo ?? 'Paquete de contenido'}
          className="aspect-video w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="fullscreen"
        />
      </div>
      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3">
        <Play aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.9} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          {tipo === 'xapi'
            ? 'Paquete xAPI — reporta la actividad al LRS por la cola envio-xapi.'
            : 'Paquete SCORM — el player captura el progreso (postMessage) que la API persiste.'}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Estados de ingesta ───────────────────────── */

function EstadoProcesando() {
  return (
    <div className="flex items-center gap-3 px-5 py-8">
      <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-secondary" strokeWidth={2} />
      <p className={`text-[13px] leading-relaxed ${softText}`}>
        Descomprimiendo y validando el manifiesto en el worker… El paquete estará listo en unos momentos.
      </p>
    </div>
  );
}

function EstadoError({ mensaje }: { mensaje?: string }) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-start gap-2.5 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-3">
        <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
        <p className="text-[12.5px] leading-relaxed text-destructive">
          {mensaje ?? 'El paquete no se pudo procesar. Revisa que sea un .zip SCORM/xAPI válido y vuelve a intentarlo.'}
        </p>
      </div>
    </div>
  );
}

function PendienteReproduccion() {
  return (
    <>
      <div className="relative grid min-h-[180px] w-full place-items-center bg-[color:var(--sidebar)]">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
        />
        <span aria-hidden className="relative grid h-[56px] w-[56px] place-items-center rounded-full bg-white/[0.18] text-white">
          <Boxes className="h-6 w-6" strokeWidth={1.5} />
        </span>
      </div>
      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
        <Boxes aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          Paquete aún sin lanzador. Se sirve desde la API tras la ingesta —{' '}
          <span className="font-bold">pendiente de API</span> (GET /scorm/play/:id · GET /xapi/play/:id).
        </p>
      </div>
    </>
  );
}
