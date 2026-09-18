'use client';

/**
 * Bloque VIDEO (§3 · §5B) — reproductor Vidstack + panel de TRANSCRIPCIÓN + HITOS de
 * consulta rápida. Sirve al alumno en la lección/videoteca (modo `ver`) y al diseñador
 * al armar el bloque (modo `editar`, donde puede marcar hitos sobre la línea de tiempo).
 *
 * Regla de Oro (§2): la pieza es client; la fuente del video (`src`) llega por URL firmada
 * del servicio de media (contrato en ../contratos.ts). Los hitos son dato de `contenidos`:
 * este componente es CONTROLADO — expone su estado por `onCambioHitos` y el contenedor
 * decide cuándo persistir (CRUD web→Supabase bajo RLS). La transcripción se genera de
 * forma asíncrona en el worker (PENDIENTE DE API) — aquí se consume.
 *
 * shadcn/Vidstack PERSONALIZADO (§5A): el layout por defecto se tiñe con los tokens del
 * proyecto (`--media-brand` = teal `--primary`, tipografía Inter); nada de skin genérico.
 */

import { useMemo, useRef, useState } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  useMediaState,
  type MediaPlayerInstance,
} from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import {
  Bookmark,
  FileText,
  Play,
  Plus,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import type { CueTranscripcion, HitoVideo } from '@/components/bloques/contratos';

/** Estilo de reproducción: tiñe el layout de Vidstack con los tokens del proyecto (§5A). */
const ESTILO_PLAYER = {
  '--media-brand': 'var(--primary)',
  '--media-font-family': 'Inter, ui-sans-serif, system-ui, sans-serif',
};

/** mm:ss para cifras de tiempo (mono, §5A). */
function mmss(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const s = Math.floor(segundos % 60);
  const m = Math.floor(segundos / 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type BloqueVideoProps = {
  /** URL firmada del video (Stream / object storage). `null` → media pendiente. */
  src: string | null;
  /** Póster/miniatura opcional. */
  poster?: string | null;
  /** Título del contenido. */
  titulo?: string;
  /** Migaja "Programa · Módulo · Lección". */
  contexto?: string;
  /** Cues de transcripción sincronizados (los genera el worker · PENDIENTE DE API). */
  transcripcion?: CueTranscripcion[];
  /** Hitos de consulta rápida. Controlado. */
  hitos?: HitoVideo[];
  /** `ver` (alumno) | `editar` (diseñador arma el bloque). */
  modo?: 'ver' | 'editar';
  /** Cambia la lista de hitos (marcar / renombrar / borrar). Requerido para editar. */
  onCambioHitos?: (hitos: HitoVideo[]) => void;
};

export function BloqueVideo({
  src,
  poster,
  titulo,
  contexto,
  transcripcion = [],
  hitos = [],
  modo = 'ver',
  onCambioHitos,
}: BloqueVideoProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const editable = modo === 'editar' && typeof onCambioHitos === 'function';
  const [tab, setTab] = useState<'transcripcion' | 'hitos'>(
    transcripcion.length > 0 ? 'transcripcion' : 'hitos',
  );

  const hitosOrdenados = useMemo(
    () => [...hitos].sort((a, b) => a.tiempo - b.tiempo),
    [hitos],
  );

  function irA(tiempo: number) {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = tiempo;
    void p.play?.();
  }

  if (!src) {
    return <PendienteMedia titulo={titulo} contexto={contexto} />;
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ════════ Reproductor + riel de hitos ════════ */}
      <div className="min-w-0">
        <div className={`${card} overflow-hidden`}>
          <MediaPlayer
            ref={playerRef}
            src={src}
            title={titulo}
            playsInline
            crossOrigin
            style={ESTILO_PLAYER}
            className="aspect-video w-full overflow-hidden bg-[color:var(--sidebar)] font-sans"
          >
            <MediaProvider>
              {poster && <Poster className="vds-poster" src={poster} alt={titulo ?? 'Video'} />}
            </MediaProvider>
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>

          <RielHitos
            playerRef={playerRef}
            hitos={hitosOrdenados}
            editable={editable}
            onIr={irA}
            onMarcar={(tiempo) => {
              const nuevo: HitoVideo = {
                id: crypto.randomUUID(),
                tiempo,
                titulo: `Hito ${hitos.length + 1}`,
              };
              onCambioHitos?.([...hitos, nuevo]);
              setTab('hitos');
            }}
          />
        </div>

        {(titulo || contexto) && (
          <div className="mt-3">
            {titulo && <p className="text-[15px] font-bold leading-snug">{titulo}</p>}
            {contexto && <p className="mt-1 text-[12px] text-muted-foreground">{contexto}</p>}
          </div>
        )}
      </div>

      {/* ════════ Panel: Transcripción | Hitos ════════ */}
      <aside className={`${card} flex min-w-0 flex-col overflow-hidden`}>
        <div role="tablist" aria-label="Consulta del video" className="flex shrink-0 border-b border-border">
          <TabBoton
            activo={tab === 'transcripcion'}
            onClick={() => setTab('transcripcion')}
            icono={FileText}
            etiqueta="Transcripción"
            cuenta={transcripcion.length}
          />
          <TabBoton
            activo={tab === 'hitos'}
            onClick={() => setTab('hitos')}
            icono={Bookmark}
            etiqueta="Hitos"
            cuenta={hitosOrdenados.length}
          />
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto max-h-[520px]">
          {tab === 'transcripcion' ? (
            <PanelTranscripcion playerRef={playerRef} cues={transcripcion} onIr={irA} editable={editable} />
          ) : (
            <PanelHitos
              playerRef={playerRef}
              hitos={hitosOrdenados}
              editable={editable}
              onIr={irA}
              onMarcar={(tiempo) => {
                const nuevo: HitoVideo = {
                  id: crypto.randomUUID(),
                  tiempo,
                  titulo: `Hito ${hitos.length + 1}`,
                };
                onCambioHitos?.([...hitos, nuevo]);
              }}
              onRenombrar={(id, titulo2) =>
                onCambioHitos?.(hitos.map((h) => (h.id === id ? { ...h, titulo: titulo2 } : h)))
              }
              onBorrar={(id) => onCambioHitos?.(hitos.filter((h) => h.id !== id))}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Tab ───────────────────────── */

function TabBoton({
  activo,
  onClick,
  icono: Icono,
  etiqueta,
  cuenta,
}: {
  activo: boolean;
  onClick: () => void;
  icono: typeof FileText;
  etiqueta: string;
  cuenta: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 px-3 py-3 text-[12.5px] font-bold transition-colors ${focusRing} ${
        activo ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      {etiqueta}
      <span className={`${mono} text-[11px] ${activo ? 'text-secondary' : 'text-muted-foreground'}`}>{cuenta}</span>
      {activo && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
    </button>
  );
}

/* ───────────────────────── Riel de hitos (bajo el player) ───────────────────────── */

function RielHitos({
  playerRef,
  hitos,
  editable,
  onIr,
  onMarcar,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  hitos: HitoVideo[];
  editable: boolean;
  onIr: (t: number) => void;
  onMarcar: (t: number) => void;
}) {
  const duracion = useMediaState('duration', playerRef);
  const tiempo = useMediaState('currentTime', playerRef);
  const total = duracion > 0 ? duracion : 0;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-muted px-4 py-3">
      {/* riel con marcadores */}
      <div className="relative h-2 flex-1 rounded-full bg-[color:var(--track)]">
        {total > 0 && (
          <span
            aria-hidden
            className="absolute top-0 h-2 rounded-full bg-secondary/25"
            style={{ width: `${Math.min(100, (tiempo / total) * 100)}%` }}
          />
        )}
        {hitos.map((h) => {
          const pct = total > 0 ? Math.min(100, Math.max(0, (h.tiempo / total) * 100)) : 0;
          return (
            <button
              key={h.id}
              type="button"
              title={`${h.titulo} · ${mmss(h.tiempo)}`}
              aria-label={`Ir al hito ${h.titulo} en ${mmss(h.tiempo)}`}
              onClick={() => onIr(h.tiempo)}
              className={`absolute top-1/2 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)] shadow-rest transition-transform hover:scale-110 ${focusRing}`}
              style={{ left: `${pct}%` }}
            >
              <Bookmark aria-hidden className="h-2 w-2" strokeWidth={2.5} />
            </button>
          );
        })}
      </div>
      <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>
        {mmss(tiempo)} / {mmss(total)}
      </span>
      {editable && (
        <button
          type="button"
          onClick={() => onMarcar(tiempo)}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
          Marcar hito
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Panel de transcripción ───────────────────────── */

function PanelTranscripcion({
  playerRef,
  cues,
  onIr,
  editable,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  cues: CueTranscripcion[];
  onIr: (t: number) => void;
  editable: boolean;
}) {
  const tiempo = useMediaState('currentTime', playerRef);

  if (cues.length === 0) {
    return (
      <div className="flex items-start gap-3 px-4 py-4">
        <FileText aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
          {editable ? (
            <>
              Este video aún no tiene transcripción. La transcripción se genera de forma asíncrona en el
              worker al procesar el video —{' '}
              <span className="font-bold">pendiente de API</span> (GET /media/transcripcion).
            </>
          ) : (
            'Este video aún no tiene transcripción disponible.'
          )}
        </p>
      </div>
    );
  }

  const activo = cues.findIndex((c) => tiempo >= c.inicio && tiempo < c.fin);

  return (
    <ol className="flex flex-col py-1">
      {cues.map((c, i) => {
        const esActivo = i === activo;
        return (
          <li key={`${c.inicio}-${i}`}>
            <button
              type="button"
              onClick={() => onIr(c.inicio)}
              aria-current={esActivo ? 'true' : undefined}
              className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${focusRing} ${
                esActivo ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <span className={`${mono} mt-0.5 shrink-0 text-[11px] ${esActivo ? 'font-bold text-secondary' : 'text-muted-foreground'}`}>
                {mmss(c.inicio)}
              </span>
              <span className="min-w-0">
                {c.locutor && (
                  <span className="mr-1.5 text-[11.5px] font-bold text-secondary">{c.locutor}:</span>
                )}
                <span className={`text-[13px] leading-relaxed ${esActivo ? 'font-semibold text-foreground' : softText}`}>
                  {c.texto}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────────────────── Panel de hitos ───────────────────────── */

function PanelHitos({
  playerRef,
  hitos,
  editable,
  onIr,
  onMarcar,
  onRenombrar,
  onBorrar,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  hitos: HitoVideo[];
  editable: boolean;
  onIr: (t: number) => void;
  onMarcar: (t: number) => void;
  onRenombrar: (id: string, titulo: string) => void;
  onBorrar: (id: string) => void;
}) {
  const tiempo = useMediaState('currentTime', playerRef);

  return (
    <div className="flex flex-col">
      {editable && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <p className={`${kicker} text-muted-foreground`}>Marca puntos de consulta</p>
          <button
            type="button"
            onClick={() => onMarcar(tiempo)}
            className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
          >
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
            Aquí ({mmss(tiempo)})
          </button>
        </div>
      )}

      {hitos.length === 0 ? (
        <div className="flex items-start gap-3 px-4 py-4">
          <Bookmark aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <p className={`text-[12.5px] leading-relaxed ${softText}`}>
            {editable
              ? 'Sin hitos todavía. Reproduce el video y marca los momentos clave para consulta rápida.'
              : 'Este video no tiene hitos de consulta.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col py-1">
          {hitos.map((h) => (
            <li key={h.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-muted">
              <button
                type="button"
                onClick={() => onIr(h.tiempo)}
                aria-label={`Ir a ${h.titulo}`}
                className={`mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-[color:var(--sidebar)] ${focusRing}`}
              >
                <Play aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                <span className={mono}>{mmss(h.tiempo)}</span>
              </button>
              <span className="min-w-0 flex-1">
                {editable ? (
                  <input
                    defaultValue={h.titulo}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== h.titulo) onRenombrar(h.id, v);
                      else e.target.value = h.titulo;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    aria-label="Título del hito"
                    className={`w-full rounded-[7px] border border-transparent bg-transparent px-1 py-1 text-[13px] font-semibold leading-snug outline-none hover:border-border focus:border-secondary focus:bg-card ${focusRing}`}
                  />
                ) : (
                  <span className="block px-1 py-1 text-[13px] font-semibold leading-snug">{h.titulo}</span>
                )}
                {h.nota && <span className={`mt-0.5 block px-1 text-[12px] ${softText}`}>{h.nota}</span>}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => onBorrar(h.id)}
                  aria-label={`Borrar hito ${h.titulo}`}
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
                >
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Estado: media pendiente ───────────────────────── */

function PendienteMedia({ titulo, contexto }: { titulo?: string; contexto?: string }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div
        className="relative grid aspect-video w-full place-items-center bg-[color:var(--sidebar)]"
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
        />
        <span aria-hidden className="relative grid h-[60px] w-[60px] place-items-center rounded-full bg-white/[0.18] text-white">
          <VideoIcon className="h-6 w-6" strokeWidth={1.5} />
        </span>
      </div>
      {(titulo || contexto) && (
        <div className="border-t border-border px-5 py-4">
          {titulo && <p className="text-[15px] font-bold leading-snug">{titulo}</p>}
          {contexto && <p className="mt-1 text-[12px] text-muted-foreground">{contexto}</p>}
        </div>
      )}
      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
        <VideoIcon aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          Video sin fuente vinculada. Se sirve por URL firmada del servicio de media —{' '}
          <span className="font-bold">pendiente de API</span> (GET /media/url · Cloudflare Stream / object storage).
        </p>
      </div>
    </div>
  );
}
