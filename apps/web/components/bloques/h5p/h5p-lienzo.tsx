'use client';

/**
 * Lienzo H5P (@lumieducation/h5p-react) — el editor Y el player embebidos. Vive aislado
 * para cargarse con `next/dynamic({ ssr:false })`: los web components de H5P referencian
 * `HTMLElement` y romperían el render SSR.
 *
 * Los callbacks (cargar/guardar contenido) llaman al servidor H5P self-host del DOMINIO
 * (§2 · §7): `@lumieducation/h5p-server` en `apps/api`. Aquí solo se cablean contra el
 * `base` recibido; el modelo (libraries, params, ajax) lo produce y sirve la API.
 */

import { useRef, useState } from 'react';
import { H5PEditorUI, H5PPlayerUI } from '@lumieducation/h5p-react';
import type { IContentMetadata } from '@lumieducation/h5p-server';
import { Save } from 'lucide-react';
import { focusRing } from '@/components/tokens';

async function json(res: Response) {
  if (!res.ok) throw new Error(`H5P ${res.status}`);
  return res.json();
}

export type H5PLienzoProps = {
  modo: 'ver' | 'editar';
  /** Id del contenido; `new` para crear uno nuevo en el editor. */
  contentId: string;
  /** Prefijo del servidor H5P (§7 · api). Ej: `/h5p` o `https://api.host/h5p`. */
  base: string;
  /** Lección destino: enlaza el contenido a la lección al guardar (POST /h5p/contenido). */
  leccionId?: string;
  /** Título con el que registrar el contenido en la lección. */
  titulo?: string;
  onGuardado?: (contentId: string, metadata: unknown) => void;
  onError?: (mensaje: string) => void;
  onXapi?: (statement: unknown) => void;
};

export default function H5PLienzo({
  modo,
  contentId,
  base,
  leccionId,
  titulo,
  onGuardado,
  onError,
  onXapi,
}: H5PLienzoProps) {
  const editorRef = useRef<H5PEditorUI>(null);
  const raiz = base.replace(/\/$/, '');
  const [guardando, setGuardando] = useState(false);

  if (modo === 'editar') {
    return (
      <div>
        <H5PEditorUI
          ref={editorRef}
          contentId={contentId}
          // GET /h5p/editar (nuevo) · GET /h5p/editar/:id (existente) — modelo del editor.
          loadContentCallback={async (id) =>
            json(await fetch(`${raiz}/editar${id && id !== 'new' ? `/${id}` : ''}`))
          }
          // POST /h5p/contenido — guarda/actualiza y enlaza a la lección. El cliente H5P
          // manda { library, params:{ params, metadata } }; el `api` espera params/metadata
          // en el tope, así que se aplanan aquí.
          saveContentCallback={async (id, body) => {
            const rb = body as {
              library: string;
              params?: { params?: unknown; metadata?: unknown } | unknown;
              metadata?: unknown;
            };
            const anidado =
              rb.params && typeof rb.params === 'object' && 'params' in rb.params
                ? (rb.params as { params?: unknown; metadata?: unknown })
                : undefined;
            const params = anidado ? anidado.params : rb.params;
            const metadata = anidado ? anidado.metadata ?? {} : rb.metadata ?? {};
            const r = (await json(
              await fetch(`${raiz}/contenido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contentId: id && id !== 'new' ? id : undefined,
                  library: rb.library,
                  params,
                  metadata,
                  leccionId,
                  titulo,
                }),
              }),
            )) as { contentId: string };
            return { contentId: r.contentId, metadata: metadata as IContentMetadata };
          }}
          onSaved={(id, metadata) => onGuardado?.(id, metadata)}
          onSaveError={(m) => onError?.(m)}
        />
        <div className="flex items-center justify-end border-t border-border bg-muted px-5 py-3.5">
          <button
            type="button"
            disabled={guardando}
            onClick={async () => {
              setGuardando(true);
              try {
                await editorRef.current?.save();
              } catch (e) {
                onError?.(e instanceof Error ? e.message : 'Error al guardar el H5P');
              } finally {
                setGuardando(false);
              }
            }}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            {guardando ? 'Guardando…' : 'Guardar interactivo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <H5PPlayerUI
      contentId={contentId}
      // GET /h5p/contenido/:id/reproducir — modelo del player (emite xAPI al LRS).
      loadContentCallback={async (id) => json(await fetch(`${raiz}/contenido/${id}/reproducir`))}
      onxAPIStatement={(statement) => onXapi?.(statement)}
    />
  );
}
