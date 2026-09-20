'use client';

/**
 * Bloque H5P (§3 · §7 · §5B) — integra el EDITOR y el PLAYER de H5P dentro del Studio /
 * la lección con `@lumieducation/h5p-react`. El diseñador arma el interactivo; el alumno
 * lo consume (emite xAPI al LRS vía la cola `envio-xapi`).
 *
 * Regla de Oro (§2 · §7): el servidor H5P self-host (`@lumieducation/h5p-server`) corre en
 * `apps/api` — sirve libraries, contenido y AJAX, y captura los statements. Este bloque solo
 * embebe la UI y la cablea contra el prefijo `servidorBase`. Mientras la API no exponga el
 * servidor H5P, el bloque muestra su estado "servidor pendiente" con el contrato (§ contratos).
 *
 * El lienzo H5P se carga con `ssr:false` porque sus web components referencian `HTMLElement`.
 */

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Blocks, TriangleAlert } from 'lucide-react';
import { mono, kicker, softText, card } from '@/components/tokens';

const H5PLienzo = dynamic(() => import('./h5p-lienzo'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[220px] w-full place-items-center bg-muted">
      <span className={`${mono} text-[11px] text-muted-foreground`}>cargando H5P…</span>
    </div>
  ),
});

export type BloqueH5PProps = {
  /** `ver` (alumno) | `editar` (diseñador arma el H5P). */
  modo?: 'ver' | 'editar';
  /** Id del contenido H5P; `new` para crear uno nuevo (editar). */
  contentId?: string;
  /**
   * Prefijo del servidor H5P self-host (§7 · api), ej. `/h5p`. Si es `null`/ausente, el
   * bloque muestra "servidor pendiente" — no monta la UI (que fallaría sin backend).
   */
  servidorBase?: string | null;
  /** Lección destino: enlaza el contenido a la lección al guardar (POST /h5p/contenido). */
  leccionId?: string;
  titulo?: string;
  contexto?: string;
  onGuardado?: (contentId: string, metadata: unknown) => void;
  onXapi?: (statement: unknown) => void;
};

export function BloqueH5P({
  modo = 'ver',
  contentId,
  servidorBase,
  leccionId,
  titulo,
  contexto,
  onGuardado,
  onXapi,
}: BloqueH5PProps) {
  const [error, setError] = useState<string | null>(null);
  const id = contentId ?? (modo === 'editar' ? 'new' : '');

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <Blocks className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          {titulo && <span className="block truncate text-[14px] font-bold leading-snug">{titulo}</span>}
          {contexto && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contexto}</span>}
        </span>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-[11px] font-bold text-muted-foreground">
          H5P · {modo === 'editar' ? 'Editor' : 'Interactivo'}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 border-b border-border bg-[color:var(--destructive-surface)] px-5 py-3">
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
          <p className="text-[12.5px] leading-relaxed text-destructive">{error}</p>
        </div>
      )}

      {servidorBase ? (
        <H5PLienzo
          modo={modo}
          contentId={id}
          base={servidorBase}
          leccionId={leccionId}
          titulo={titulo}
          onGuardado={onGuardado}
          onError={setError}
          onXapi={onXapi}
        />
      ) : (
        <PendienteServidor modo={modo} />
      )}
    </div>
  );
}

/* ───────────────────────── Estado: servidor H5P pendiente ───────────────────────── */

function PendienteServidor({ modo }: { modo: 'ver' | 'editar' }) {
  return (
    <>
      <div className="relative grid min-h-[200px] w-full place-items-center bg-[color:var(--sidebar)]">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
        />
        <span aria-hidden className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-white/[0.18] text-white">
          <Blocks className="h-6 w-6" strokeWidth={1.5} />
        </span>
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className={`${kicker} text-muted-foreground`}>Servidor H5P</p>
        <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>
          {modo === 'editar'
            ? 'El editor de H5P arma interactivos (preguntas, drag-and-drop, ramificaciones) dentro del Studio.'
            : 'El interactivo H5P se reproduce aquí y reporta actividad al LRS.'}
        </p>
      </div>
      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
        <Blocks aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          El servidor H5P self-host (@lumieducation/h5p-server) corre en el dominio —{' '}
          <span className="font-bold">pendiente de API</span> (GET/POST /h5p/editor/:id · GET /h5p/play/:id;
          los statements xAPI viajan por la cola envio-xapi).
        </p>
      </div>
    </>
  );
}
