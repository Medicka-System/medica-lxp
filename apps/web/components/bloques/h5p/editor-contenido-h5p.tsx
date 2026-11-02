'use client';

/**
 * Editor de la FUENTE de un contenido H5P, COMPARTIDO por la lección tipo H5P
 * (`_editores/editor-h5p.tsx`) y el bloque H5P dentro de teoría (`teoria/editores-bloque`).
 * Antes eran dos UIs distintas (una pelada, otra con selector) → inconsistencia. Aquí viven
 * en UN solo lugar para que ambas se comporten igual:
 *
 *   · Autorar / subir .h5p → el editor de `@lumieducation/h5p-react` (crear desde cero o
 *     usar su pestaña "Upload") MÁS un uploader EXPLÍCITO de paquete `.h5p` (POST /h5p/paquete).
 *   · Enlace externo        → embeber un H5P alojado en otro host por su URL (iframe).
 *
 * Solo gestiona la FUENTE (`{ contentId | url }`); el título lo pone el contenedor (el
 * bloque tiene su propio campo; la lección usa su nombre).
 */

import { useRef, useState } from 'react';
import { FileUp, Link2, Upload, TriangleAlert } from 'lucide-react';
import { BloqueH5P } from './bloque-h5p';
import { focusRing, softText } from '@/components/tokens';

export type ConfigContenidoH5P = { contentId?: string; url?: string };

export function EditorContenidoH5P({
  config,
  onCambio,
  base,
  leccionId,
  titulo,
}: {
  config: ConfigContenidoH5P;
  /** Recibe el parche a aplicar: `{ contentId, url }` (uno u otro, el opuesto en undefined). */
  onCambio: (patch: ConfigContenidoH5P) => void;
  /** Prefijo del servidor H5P (mismo-origen `/h5p`, ver `base.ts`). */
  base: string;
  leccionId?: string;
  titulo?: string;
}) {
  const [modo, setModo] = useState<'subir' | 'enlace'>(config.url ? 'enlace' : 'subir');
  const [enlace, setEnlace] = useState(config.url ?? '');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const raiz = base.replace(/\/$/, '');

  async function subirPaquete(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      if (titulo) fd.append('titulo', titulo);
      // Mismo-origen: el rewrite de Next reenvía /h5p/* al api (POST multipart → subirPaquete).
      const res = await fetch(`${raiz}/paquete`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`El servidor rechazó el paquete (HTTP ${res.status}).`);
      const r = (await res.json()) as { contentId: string };
      onCambio({ contentId: r.contentId, url: undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el paquete .h5p.');
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="grid gap-3">
      {/* Selector de fuente (idéntico en lección y bloque). */}
      <div className="inline-flex rounded-[10px] border border-border bg-muted p-0.5">
        {(
          [
            ['subir', 'Autorar / subir .h5p', Upload],
            ['enlace', 'Pegar enlace', Link2],
          ] as const
        ).map(([id, etiqueta, Icono]) => {
          const on = modo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-bold transition-colors ${focusRing} ${
                on ? 'bg-card text-foreground shadow-rest' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />
              {etiqueta}
            </button>
          );
        })}
      </div>

      {modo === 'subir' ? (
        <div className="grid gap-2.5">
          {/* Uploader EXPLÍCITO de paquete .h5p (#2): sube el archivo y fija el contentId. */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".h5p"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirPaquete(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-4 text-[12.5px] font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              <FileUp aria-hidden className="h-4 w-4" strokeWidth={1.9} />
              {subiendo ? 'Subiendo…' : 'Subir paquete .h5p'}
            </button>
            <span className={`text-[11.5px] ${softText}`}>o autora el interactivo abajo</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2">
              <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
              <p className="text-[12px] leading-relaxed text-destructive">{error}</p>
            </div>
          )}

          <BloqueH5P
            modo="editar"
            contentId={config.contentId || undefined}
            servidorBase={base}
            leccionId={leccionId}
            titulo={titulo}
            contexto="Interactivo H5P · autora desde cero o sube un .h5p; se previsualiza en el Studio"
            onGuardado={(id) => onCambio({ contentId: id, url: undefined })}
          />
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="https://…"
              className={`h-10 min-w-[220px] flex-1 rounded-[9px] border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground ${focusRing}`}
            />
            <button
              type="button"
              disabled={!enlace.trim()}
              onClick={() => {
                const u = enlace.trim();
                if (/^https?:\/\/\S+/i.test(u)) onCambio({ url: u, contentId: undefined });
              }}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] bg-primary px-4 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              <Link2 aria-hidden className="h-4 w-4" strokeWidth={2} />
              Vincular enlace
            </button>
          </div>
          <p className={`text-[11.5px] leading-relaxed ${softText}`}>
            Embebe un H5P alojado en otro sitio (H5P.com u otro host) por su URL de incrustación.
          </p>
          {/^https?:\/\/\S+/i.test(enlace) && (
            <div className="overflow-hidden rounded-[10px] border border-border bg-[color:var(--sidebar)]">
              <iframe
                src={enlace}
                title={titulo || 'Interactivo H5P'}
                className="aspect-video w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="fullscreen"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
