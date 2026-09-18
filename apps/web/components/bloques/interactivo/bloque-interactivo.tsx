'use client';

/**
 * Bloque INTERACTIVO BÁSICO (§3 · §5B) — hotspots/etiquetas sobre una imagen base
 * (ecografía, esquema anatómico) o un frame de video. El diseñador coloca puntos y les
 * escribe etiqueta + descripción; el alumno los explora (clic → revela el detalle).
 *
 * Regla de Oro (§2): pieza client, controlada (onCambio). La imagen base llega por URL
 * firmada del servicio de media (contrato en ../contratos.ts); los hotspots son dato de
 * `contenidos` que el contenedor persiste (CRUD web→Supabase bajo RLS).
 *
 * El canvas (react-konva) se carga con `ssr:false` porque konva requiere el módulo nativo
 * `canvas` en Node y rompería el render del servidor. Los puntos también se exponen como
 * lista DOM (chips numerados) para teclado, lectores de pantalla y móvil.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MousePointerClick, Plus, ShapesIcon, Trash2 } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import type { Hotspot } from '@/components/bloques/contratos';

const LienzoHotspots = dynamic(() => import('./lienzo-hotspots'), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-video w-full place-items-center bg-muted">
      <span className={`${mono} text-[11px] text-muted-foreground`}>preparando lienzo…</span>
    </div>
  ),
});

export type BloqueInteractivoProps = {
  /** URL firmada de la imagen base (o frame de video). `null` → media pendiente. */
  src: string | null;
  /** Título del interactivo. */
  titulo?: string;
  /** Migaja de contexto. */
  contexto?: string;
  /** Hotspots colocados. Controlado. */
  hotspots?: Hotspot[];
  /** `ver` (alumno explora) | `editar` (diseñador coloca puntos). */
  modo?: 'ver' | 'editar';
  /** Cambia la lista de hotspots. Requerido para editar. */
  onCambio?: (hotspots: Hotspot[]) => void;
};

export function BloqueInteractivo({
  src,
  titulo,
  contexto,
  hotspots = [],
  modo = 'ver',
  onCambio,
}: BloqueInteractivoProps) {
  const editable = modo === 'editar' && typeof onCambio === 'function';
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
  const [ancho, setAncho] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  // Carga la imagen base.
  useEffect(() => {
    if (!src) {
      setImagen(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImagen(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  // Mide el ancho disponible (responsive).
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setAncho(el.clientWidth));
    ro.observe(el);
    setAncho(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const aspecto = imagen && imagen.naturalWidth > 0 ? imagen.naturalHeight / imagen.naturalWidth : 9 / 16;
  const alto = Math.round(ancho * aspecto);

  const seleccionadoHotspot = useMemo(
    () => hotspots.find((h) => h.id === seleccionado) ?? null,
    [hotspots, seleccionado],
  );

  function agregar(x: number, y: number) {
    const nuevo: Hotspot = { id: crypto.randomUUID(), x, y, etiqueta: `Punto ${hotspots.length + 1}` };
    onCambio?.([...hotspots, nuevo]);
    setSeleccionado(nuevo.id);
  }
  function mover(id: string, x: number, y: number) {
    onCambio?.(hotspots.map((h) => (h.id === id ? { ...h, x, y } : h)));
  }
  function editar(id: string, campos: Partial<Hotspot>) {
    onCambio?.(hotspots.map((h) => (h.id === id ? { ...h, ...campos } : h)));
  }
  function borrar(id: string) {
    onCambio?.(hotspots.filter((h) => h.id !== id));
    if (seleccionado === id) setSeleccionado(null);
  }

  if (!src) {
    return <PendienteImagen titulo={titulo} contexto={contexto} />;
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <ShapesIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          {titulo && <span className="block truncate text-[14px] font-bold leading-snug">{titulo}</span>}
          {contexto && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contexto}</span>}
        </span>
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11px] font-bold text-muted-foreground">
          <span className={mono}>{hotspots.length}</span> puntos
        </span>
      </div>

      {editable && (
        <p className="flex items-center gap-2 border-b border-border bg-[color:var(--accent)] px-5 py-2.5 text-[12px] font-semibold text-accent-foreground">
          <MousePointerClick aria-hidden className="h-4 w-4" strokeWidth={1.9} />
          Haz clic sobre la imagen para agregar un punto. Arrástralo para reubicarlo.
        </p>
      )}

      {/* Canvas + burbuja de etiqueta (DOM) */}
      <div className="p-5">
        <div ref={contenedorRef} className="relative w-full overflow-hidden rounded-[10px] border border-border bg-[color:var(--sidebar)]">
          {imagen && ancho > 0 ? (
            <LienzoHotspots
              imagen={imagen}
              ancho={ancho}
              alto={alto}
              hotspots={hotspots}
              editable={editable}
              seleccionado={seleccionado}
              onSeleccionar={setSeleccionado}
              onAgregar={agregar}
              onMover={mover}
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center">
              <span className={`${mono} text-[11px] text-[color:var(--hero-ink-muted)]`}>cargando imagen…</span>
            </div>
          )}

          {/* Burbuja de la etiqueta seleccionada (revelar al explorar) */}
          {!editable && seleccionadoHotspot && ancho > 0 && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-[10px] bg-[color:var(--sidebar)] px-3 py-2 text-[color:var(--hero-ink)] shadow-rest"
              style={{
                left: `${seleccionadoHotspot.x * ancho}px`,
                top: `${seleccionadoHotspot.y * alto - 22}px`,
              }}
            >
              <p className="text-[12.5px] font-bold leading-snug">{seleccionadoHotspot.etiqueta}</p>
              {seleccionadoHotspot.descripcion && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--hero-ink-soft)]">
                  {seleccionadoHotspot.descripcion}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista de puntos (a11y + edición) */}
      <div className="border-t border-border px-5 py-4">
        {hotspots.length === 0 ? (
          <p className={`text-[12.5px] leading-relaxed ${softText}`}>
            {editable ? 'Sin puntos todavía. Haz clic sobre la imagen para colocar el primero.' : 'Este interactivo no tiene puntos.'}
          </p>
        ) : editable ? (
          <ul className="flex flex-col gap-2.5">
            {hotspots.map((h, i) => (
              <li
                key={h.id}
                className={`flex items-start gap-2.5 rounded-[10px] border p-2.5 transition-colors ${
                  h.id === seleccionado ? 'border-primary bg-accent' : 'border-border bg-card'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSeleccionado(h.id)}
                  aria-label={`Seleccionar punto ${i + 1}`}
                  className={`${mono} mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-[color:var(--sidebar)] ${focusRing}`}
                >
                  {i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    value={h.etiqueta}
                    onChange={(e) => editar(h.id, { etiqueta: e.target.value })}
                    onFocus={() => setSeleccionado(h.id)}
                    aria-label={`Etiqueta del punto ${i + 1}`}
                    className={`w-full rounded-[7px] border border-border bg-card px-2 py-1.5 text-[13px] font-semibold outline-none focus:border-secondary ${focusRing}`}
                  />
                  <textarea
                    value={h.descripcion ?? ''}
                    onChange={(e) => editar(h.id, { descripcion: e.target.value })}
                    onFocus={() => setSeleccionado(h.id)}
                    placeholder="Descripción (opcional)"
                    rows={2}
                    aria-label={`Descripción del punto ${i + 1}`}
                    className={`mt-1.5 w-full resize-y rounded-[7px] border border-border bg-card px-2 py-1.5 text-[12.5px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-secondary ${focusRing}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => borrar(h.id)}
                  aria-label={`Borrar punto ${i + 1}`}
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
                >
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className={`${kicker} mb-2.5 text-muted-foreground`}>Puntos ({hotspots.length})</p>
            <div className="flex flex-wrap gap-2">
              {hotspots.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSeleccionado(h.id === seleccionado ? null : h.id)}
                  aria-pressed={h.id === seleccionado}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                    h.id === seleccionado
                      ? 'border-primary bg-primary text-[color:var(--sidebar)]'
                      : 'border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span className={`${mono} grid h-5 w-5 place-items-center rounded-full ${h.id === seleccionado ? 'bg-[color:var(--sidebar)] text-primary' : 'bg-accent text-accent-foreground'}`}>
                    {i + 1}
                  </span>
                  {h.etiqueta}
                </button>
              ))}
            </div>
            {seleccionadoHotspot?.descripcion && (
              <p className={`mt-3 rounded-[10px] bg-muted px-3.5 py-3 text-[13px] leading-relaxed ${softText}`}>
                <span className="font-bold text-foreground">{seleccionadoHotspot.etiqueta}:</span>{' '}
                {seleccionadoHotspot.descripcion}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Estado: imagen pendiente ───────────────────────── */

function PendienteImagen({ titulo, contexto }: { titulo?: string; contexto?: string }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="relative grid aspect-video w-full place-items-center bg-[color:var(--sidebar)]">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
        />
        <span aria-hidden className="relative grid h-[60px] w-[60px] place-items-center rounded-full bg-white/[0.18] text-white">
          <ShapesIcon className="h-6 w-6" strokeWidth={1.5} />
        </span>
      </div>
      {(titulo || contexto) && (
        <div className="border-t border-border px-5 py-4">
          {titulo && <p className="text-[15px] font-bold leading-snug">{titulo}</p>}
          {contexto && <p className="mt-1 text-[12px] text-muted-foreground">{contexto}</p>}
        </div>
      )}
      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
        <Plus aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          Interactivo sin imagen base. Se sirve por URL firmada del servicio de media —{' '}
          <span className="font-bold">pendiente de API</span> (GET /media/url).
        </p>
      </div>
    </div>
  );
}
