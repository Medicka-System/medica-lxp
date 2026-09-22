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

import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
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
  Download,
  FileText,
  Loader2,
  Play,
  Plus,
  Search,
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

/**
 * Fuente lista para Vidstack: shorthand de embed (string) o LISTA de archivos con tipo
 * explícito (`MediaSrc[]`, la forma que el prop `src` del player acepta sin ambigüedad).
 */
export type FuenteVidstack = string | { src: string; type: string }[];

/**
 * Adivina el MIME de un archivo directo por su extensión (ignorando el query de la URL
 * firmada). Los videos SUBIDOS se guardan en `.../original` SIN extensión, así que el
 * fallback es `video/mp4` (el content-type por defecto de la subida · media-acciones).
 */
function mimeDeUrl(url: string): string {
  const ruta = url.split('?')[0]!.toLowerCase();
  if (ruta.endsWith('.webm')) return 'video/webm';
  if (ruta.endsWith('.ogv') || ruta.endsWith('.ogg')) return 'video/ogg';
  if (ruta.endsWith('.mov')) return 'video/quicktime';
  if (ruta.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'; // HLS (Stream)
  if (ruta.endsWith('.mpd')) return 'application/dash+xml';
  return 'video/mp4';
}

/**
 * Normaliza la fuente para Vidstack. YouTube/Vimeo se pasan con el shorthand que el
 * player reconoce (`youtube/<id>` · `vimeo/<id>`) — una URL cruda tipo `youtu.be/ID?si=…`
 * NO la reproduce y deja la pantalla en azul.
 *
 * Los archivos directos (MinIO/CDN) se devuelven como OBJETO `{ src, type }` con el MIME
 * explícito: la URL firmada termina en `/original?X-Amz-…` (SIN extensión), así que sin
 * `type` Vidstack no encuentra loader y cae a un HEAD de sondeo de cabeceras. Ese HEAD
 * FALLA con 403 contra la URL firmada SOLO-GET (SigV4 firma el método) → el `<video>`
 * nunca se crea y queda la pantalla azul. Con `type` usa el elemento nativo (GET con
 * Range) y reproduce. `esEmbed` decide si aplicar `crossOrigin` (los iframes no lo usan).
 */
export function normalizarFuenteVideo(src: string): { src: FuenteVidstack; esEmbed: boolean } {
  const yt = src.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/i,
  );
  if (yt) return { src: `youtube/${yt[1]}`, esEmbed: true };
  const vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { src: `vimeo/${vm[1]}`, esEmbed: true };
  return { src: [{ src, type: mimeDeUrl(src) }], esEmbed: false };
}

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
  /**
   * Expone una API imperativa del reproductor al contenedor (saltar a un segundo,
   * leer el tiempo actual) — la usa la lección de video para los MARCADORES de nota
   * (§5A · mig 0027). Se llama una vez cuando el player está listo.
   */
  onApi?: (api: VideoApi) => void;
  /**
   * Alumno (mock leccion-estudio): botón "Guardar nota" en la card que captura el
   * MOMENTO actual del video. Recibe el segundo redondeado. Undefined → no se muestra.
   */
  onGuardarMomento?: (segundos: number) => void;
  /**
   * Hay una fuente pero aún se está firmando (video subido · `src` llega tras el
   * signing). Muestra un estado de CARGA en vez del aviso "media pendiente".
   */
  cargando?: boolean;
};

/** API imperativa que BloqueVideo expone a su contenedor (marcadores de nota). */
export type VideoApi = { irA: (segundos: number) => void; tiempoActual: () => number };

export function BloqueVideo({
  src,
  poster,
  titulo,
  contexto,
  transcripcion = [],
  hitos = [],
  modo = 'ver',
  onCambioHitos,
  onApi,
  onGuardarMomento,
  cargando = false,
}: BloqueVideoProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const editable = modo === 'editar' && typeof onCambioHitos === 'function';
  // Hitos primero (mock leccion-estudio): arranca en Hitos si los hay.
  const [tab, setTab] = useState<'hitos' | 'transcripcion'>(
    hitos.length > 0 ? 'hitos' : transcripcion.length > 0 ? 'transcripcion' : 'hitos',
  );

  const hitosOrdenados = useMemo(
    () => [...hitos].sort((a, b) => a.tiempo - b.tiempo),
    [hitos],
  );
  const transcripcionOrdenada = useMemo(
    () => [...transcripcion].sort((a, b) => a.inicio - b.inicio),
    [transcripcion],
  );

  // Controles de la pestaña Transcripción (mock leccion-estudio): filtro en cliente y
  // "seguir el video" (auto-desplaza a la línea en curso), encendido por defecto.
  const [busca, setBusca] = useState('');
  const [seguir, setSeguir] = useState(true);

  /** Baja la transcripción como texto plano con tiempos (mm:ss⇥texto). */
  function descargarTranscripcion() {
    const texto = transcripcionOrdenada.map((c) => `${mmss(c.inicio)}\t${c.texto}`).join('\n');
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(titulo ?? 'transcripcion').trim().replace(/[^\w.-]+/g, '_') || 'transcripcion'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function irA(tiempo: number) {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = tiempo;
    void p.play?.();
  }

  // Expone la API imperativa al contenedor (marcadores de nota · §5A). El ref del
  // player es estable, así que basta con entregarla cuando cambia el callback.
  useEffect(() => {
    onApi?.({ irA, tiempoActual: () => playerRef.current?.currentTime ?? 0 });
  }, [onApi]);

  if (!src) {
    // Video subido cuya URL firmada aún está en camino → carga, no "media pendiente".
    if (cargando) return <VideoCargando titulo={titulo} contexto={contexto} />;
    return <PendienteMedia titulo={titulo} contexto={contexto} />;
  }

  // YouTube/Vimeo → shorthand de Vidstack; archivo directo → tal cual (con crossOrigin).
  const fuente = normalizarFuenteVideo(src);

  return (
    // UNA card unificada (mock leccion-estudio · "sala de estudio"): video + timeline
    // de hitos, luego título + "Guardar nota", luego los tabs (HITOS primero,
    // Transcripción después) — todo con divisiones limpias, no piezas sueltas.
    <div className={`${card} min-w-0 overflow-hidden`}>
      <MediaPlayer
        ref={playerRef}
        // Los MIME que emitimos (video/mp4, webm, HLS…) son válidos en runtime pero más
        // amplios que la unión de literales de Vidstack; casteamos al tipo del propio prop.
        src={fuente.src as ComponentProps<typeof MediaPlayer>['src']}
        title={titulo}
        playsInline
        crossOrigin={fuente.esEmbed ? null : true}
        style={ESTILO_PLAYER}
        className="aspect-video w-full overflow-hidden bg-[color:var(--sidebar)] font-sans"
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt={titulo ?? 'Video'} />}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* Timeline con marcadores de hitos */}
      <RielHitos
        playerRef={playerRef}
        hitos={hitosOrdenados}
        editable={editable}
        onIr={irA}
        onMarcar={(tiempo) => {
          const nuevo: HitoVideo = { id: crypto.randomUUID(), tiempo, titulo: `Hito ${hitos.length + 1}` };
          onCambioHitos?.([...hitos, nuevo]);
          setTab('hitos');
        }}
      />

      {/* Título de la actividad + guardar nota al minuto actual (alumno) */}
      {(titulo || onGuardarMomento) && (
        <div className="flex items-center gap-4 border-t border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            {titulo && <p className="truncate text-[14.5px] font-bold leading-snug">{titulo}</p>}
            {contexto && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{contexto}</p>}
          </div>
          {onGuardarMomento && (
            <button
              type="button"
              onClick={() => onGuardarMomento(Math.floor(playerRef.current?.currentTime ?? 0))}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Guardar nota
            </button>
          )}
        </div>
      )}

      {/* Apoyos del video: pestañas PÍLDORA a la izquierda + controles a la derecha
          (mock leccion-estudio · "sala de estudio"). */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 pt-4">
        <div
          role="tablist"
          aria-label="Apoyos del video"
          className="flex gap-1.5 rounded-full bg-muted p-1"
        >
          {(
            [
              ['hitos', `Hallazgos · ${hitosOrdenados.length}`, 'panel-hallazgos'],
              ['transcripcion', 'Transcripción', 'panel-transcripcion'],
            ] as const
          ).map(([id, etiqueta, panelId]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={panelId}
                onClick={() => setTab(id)}
                className={`h-10 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                  on ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>

        {tab === 'transcripcion' ? (
          <>
            <label className="ml-auto flex h-11 w-full min-w-[200px] items-center gap-2 rounded-full border border-border bg-muted px-3.5 transition-colors focus-within:border-secondary sm:w-[240px]">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="sr-only">Buscar en la transcripción</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar en la transcripción…"
                className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="button"
              onClick={() => setSeguir((v) => !v)}
              aria-pressed={seguir}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
                seguir ? 'bg-accent text-accent-foreground' : 'border border-border bg-card text-muted-foreground'
              }`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${seguir ? 'bg-primary' : 'bg-[color:var(--track)]'}`}
              />
              Seguir el video
            </button>
            <button
              type="button"
              onClick={descargarTranscripcion}
              disabled={transcripcionOrdenada.length === 0}
              aria-label="Descargar la transcripción"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40 ${focusRing}`}
            >
              <Download aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <p className="ml-auto text-[12.5px] text-muted-foreground">
            {editable
              ? 'Marca y nombra los puntos clave; el alumno saltará a cada uno.'
              : 'Salte al minuto del hallazgo que quiera repasar.'}
          </p>
        )}
      </div>

      {/* Panel: HALLAZGOS — grid de 2 columnas (mock) en `ver`; editable en el Studio. */}
      <div id="panel-hallazgos" role="tabpanel" hidden={tab !== 'hitos'}>
        {editable ? (
          <PanelHitos
            playerRef={playerRef}
            hitos={hitosOrdenados}
            editable
            onIr={irA}
            onMarcar={(tiempo) => {
              const nuevo: HitoVideo = { id: crypto.randomUUID(), tiempo, titulo: `Hito ${hitos.length + 1}` };
              onCambioHitos?.([...hitos, nuevo]);
            }}
            onRenombrar={(id, titulo2) =>
              onCambioHitos?.(hitos.map((h) => (h.id === id ? { ...h, titulo: titulo2 } : h)))
            }
            onBorrar={(id) => onCambioHitos?.(hitos.filter((h) => h.id !== id))}
          />
        ) : (
          <GridHallazgos playerRef={playerRef} hitos={hitosOrdenados} onIr={irA} />
        )}
      </div>

      {/* Panel: TRANSCRIPCIÓN — lista con scroll propio; en `ver` filtra y sigue el video. */}
      <div id="panel-transcripcion" role="tabpanel" hidden={tab !== 'transcripcion'}>
        {editable ? (
          <PanelTranscripcion playerRef={playerRef} cues={transcripcionOrdenada} onIr={irA} editable />
        ) : (
          <ListaTranscripcion
            playerRef={playerRef}
            cues={transcripcionOrdenada}
            onIr={irA}
            busca={busca}
            seguir={seguir}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Panel HALLAZGOS (alumno · grid 2 columnas) ─────────────────── */

/**
 * Hallazgos del video para el ALUMNO (mock leccion-estudio): grid de 2 columnas, cada
 * uno con su timestamp en chip mono y descripción; el hallazgo en curso (±60 s del
 * minuto actual) resaltado en `bg-accent`. Salta al minuto al pulsarlo.
 */
function GridHallazgos({
  playerRef,
  hitos,
  onIr,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  hitos: HitoVideo[];
  onIr: (t: number) => void;
}) {
  const tiempo = useMediaState('currentTime', playerRef);

  if (hitos.length === 0) {
    return (
      <div className="flex items-start gap-3 px-5 pb-5 pt-4">
        <Bookmark aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>Este video no tiene hallazgos marcados.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2 px-5 pb-5 pt-4 sm:grid-cols-2">
      {hitos.map((h) => {
        const activo = Math.abs(h.tiempo - tiempo) < 60;
        return (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => onIr(h.tiempo)}
              aria-label={`Ir a ${h.titulo} en ${mmss(h.tiempo)}`}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${focusRing} ${
                activo ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <span
                className={`${mono} shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-bold ${
                  activo ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-muted text-muted-foreground'
                }`}
              >
                {mmss(h.tiempo)}
              </span>
              <span
                className={`min-w-0 text-[13.5px] leading-snug ${
                  activo ? 'font-bold text-accent-foreground' : 'font-medium text-foreground'
                }`}
              >
                {h.titulo}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────── Lista TRANSCRIPCIÓN (alumno · scroll + buscar + seguir) ─────────────── */

/**
 * Transcripción del video para el ALUMNO (mock leccion-estudio): lista con scroll propio
 * (`max-h`), cada línea salta al segundo; la línea en curso resaltada. El buscador filtra
 * en cliente; "seguir el video" auto-desplaza la línea activa vía `scrollTop` (no
 * `scrollIntoView`, para no arrastrar la página) respetando `prefers-reduced-motion`.
 */
function ListaTranscripcion({
  playerRef,
  cues,
  onIr,
  busca,
  seguir,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  cues: CueTranscripcion[];
  onIr: (t: number) => void;
  busca: string;
  seguir: boolean;
}) {
  const tiempo = useMediaState('currentTime', playerRef);
  const listaRef = useRef<HTMLUListElement>(null);
  const activoRef = useRef<HTMLLIElement>(null);

  const q = busca.trim().toLowerCase();
  const visibles = useMemo(
    () => (q ? cues.filter((c) => c.texto.toLowerCase().includes(q)) : cues),
    [cues, q],
  );

  // Índice de la línea en curso dentro de la lista COMPLETA (para el resaltado).
  const idxActivo = useMemo(() => {
    for (let i = 0; i < cues.length; i++) {
      const sig = cues[i + 1];
      if (tiempo >= cues[i]!.inicio && (!sig || tiempo < sig.inicio)) return i;
    }
    return -1;
  }, [cues, tiempo]);

  // Seguir el video: centra la línea activa moviendo scrollTop del contenedor.
  useEffect(() => {
    if (!seguir) return;
    const cont = listaRef.current;
    const fila = activoRef.current;
    if (!cont || !fila) return;
    const objetivo = fila.offsetTop - cont.clientHeight / 2 + fila.clientHeight / 2;
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cont.scrollTo({ top: Math.max(0, objetivo), behavior: reduce ? 'auto' : 'smooth' });
  }, [idxActivo, seguir]);

  if (cues.length === 0) {
    return (
      <div className="flex items-start gap-3 px-5 py-4">
        <FileText aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
          Este video aún no tiene transcripción disponible.
        </p>
      </div>
    );
  }

  if (visibles.length === 0) {
    return (
      <div className="flex items-start gap-3 px-5 py-4">
        <Search aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>
          Sin coincidencias para “{busca.trim()}”.
        </p>
      </div>
    );
  }

  return (
    <ul ref={listaRef} className="max-h-[320px] overflow-y-auto p-1.5">
      {visibles.map((c) => {
        const on = cues[idxActivo] === c;
        return (
          <li key={`${c.inicio}-${c.texto.slice(0, 8)}`} ref={on ? activoRef : undefined}>
            <button
              type="button"
              onClick={() => onIr(c.inicio)}
              aria-current={on ? 'true' : undefined}
              className={`flex w-full items-start gap-3.5 rounded-[10px] px-3.5 py-3 text-left transition-colors ${focusRing} ${
                on ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <span
                className={`${mono} mt-0.5 shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-bold ${
                  on ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-muted text-secondary'
                }`}
              >
                {mmss(c.inicio)}
              </span>
              <span className="min-w-0">
                {c.locutor && <span className="mr-1.5 text-[12px] font-bold text-secondary">{c.locutor}:</span>}
                <span
                  className={`text-[14px] leading-[1.65] ${
                    on ? 'font-semibold text-foreground' : 'text-[color:var(--foreground-soft)]'
                  }`}
                >
                  {c.texto}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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

/** Estado de CARGA: hay video subido, se está firmando la URL de reproducción. */
function VideoCargando({ titulo, contexto }: { titulo?: string; contexto?: string }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="relative grid aspect-video w-full place-items-center bg-[color:var(--sidebar)]">
        <span className="flex flex-col items-center gap-2.5 text-white">
          <Loader2 aria-hidden className="h-8 w-8 animate-spin" strokeWidth={1.75} />
          <span className="text-[12.5px] font-semibold text-white/80">Preparando el video…</span>
        </span>
      </div>
      {(titulo || contexto) && (
        <div className="border-t border-border px-5 py-4">
          {titulo && <p className="text-[15px] font-bold leading-snug">{titulo}</p>}
          {contexto && <p className="mt-1 text-[12px] text-muted-foreground">{contexto}</p>}
        </div>
      )}
    </div>
  );
}

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
