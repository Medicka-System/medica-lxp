'use client';

/**
 * EditorVideoAutoria — superficie de AUTORÍA de video COMPARTIDA (§5C · Sprint 6).
 *
 * Es la herramienta completa con la que el diseñador arma un video, y es la MISMA en los
 * dos lugares donde se autora un video, para que se vean y funcionen IDÉNTICO:
 *   · la LECCIÓN tipo video (ocupa toda la lección · `lecciones.config`), y
 *   · el BLOQUE de video dentro de una lección de teoría (`lxp.bloques.config`).
 *
 * Qué ofrece (todo reusando `BloqueVideo`, el mismo player del alumno):
 *   · FUENTE por dos vías: SUBIR el archivo (object storage con URL firmada · media-acciones
 *     → apps/api) o PEGAR un ENLACE directo (YouTube / Stream / CDN). REEMPLAZAR o QUITAR
 *     sin perder los hitos.
 *   · HITOS de consulta rápida sobre la línea de tiempo.
 *   · TRANSCRIPCIÓN (.vtt/.srt) sincronizada.
 *   · PREVIEW en vivo con el mismo player que ve el alumno.
 *
 * COMPONENTE CONTROLADO (§2 · Regla de Oro): expone su estado por `onCambio(config)` y el
 * contenedor decide cuándo/ cómo persistir — la lección lo guarda al vuelo en
 * `lecciones.config`; el bloque lo deja en su borrador y persiste con "Guardar bloque".
 * El binario viaja navegador → object storage (PUT firmado), nunca por el `api` ni el web.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { card, focusRing, kicker, softText } from '@/lib/studio/estilos';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import type { FuenteVideoConfig } from '@/components/bloques/contratos';
import { confirmarVideo, solicitarSubidaVideo, urlReproduccionVideo } from '@/lib/studio/media-acciones';
import { parsearSubtitulos } from '@/lib/studio/subtitulos';

/** Lee la duración del video en el cliente (metadata) para pasarla al confirmar. */
function leerDuracion(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(v.duration) ? v.duration : undefined);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      v.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

export function EditorVideoAutoria({
  titulo,
  leccionId,
  config,
  onCambio,
}: {
  /** Rótulo para el player y el nombre por defecto al subir. */
  titulo: string;
  /** Lección destino (pre-registra la fila de videoteca al solicitar la subida). */
  leccionId: string;
  /** Fuente actual (controlada por el contenedor). */
  config: FuenteVideoConfig;
  /** Persiste la nueva fuente (la lección la guarda; el bloque la deja en borrador). */
  onCambio: (config: FuenteVideoConfig) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modoFuente, setModoFuente] = useState<'subir' | 'enlace'>(config.url ? 'enlace' : 'subir');
  const [enlace, setEnlace] = useState(config.url ?? '');
  const [reemplazando, setReemplazando] = useState(false);

  const tieneVideo = config.estado === 'listo' && (!!config.videotecaId || !!config.url);
  const mostrarPicker = !tieneVideo || reemplazando;

  // Preview: enlace directo tal cual, o URL firmada de la subida (vida corta).
  useEffect(() => {
    let vivo = true;
    if (config.url) {
      setSrc(config.url);
      return;
    }
    if (config.estado !== 'listo' || !config.videotecaId) {
      setSrc(null);
      return;
    }
    urlReproduccionVideo(config.videotecaId).then((r) => {
      if (!vivo) return;
      setSrc(r.ok ? r.datos.urlReproduccion : null);
    });
    return () => {
      vivo = false;
    };
  }, [config.url, config.videotecaId, config.estado]);

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const duracionSeg = await leerDuracion(file);
      const sol = await solicitarSubidaVideo({ leccionId, titulo: titulo || file.name });
      if (!sol.ok) {
        setError(sol.error);
        return;
      }
      const put = await fetch(sol.datos.urlSubida, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'video/mp4' },
        body: file,
      }).catch(() => null);
      if (!put || !put.ok) {
        setError('No se pudo subir el video al almacenamiento (URL firmada). Reintenta.');
        return;
      }
      const conf = await confirmarVideo(sol.datos.videotecaId, duracionSeg);
      if (!conf.ok) {
        setError(conf.error);
        return;
      }
      // Reemplazar conserva hitos/transcripción; una fuente nueva desde cero, no.
      onCambio({
        videotecaId: sol.datos.videotecaId,
        recursoRef: sol.datos.recursoRef,
        url: undefined,
        estado: 'listo',
        duracionSeg,
        hitos: config.hitos ?? [],
        transcripcion: config.transcripcion ?? [],
      });
      setReemplazando(false);
    } finally {
      setSubiendo(false);
    }
  }

  function vincularEnlace() {
    setError(null);
    const u = enlace.trim();
    if (!/^https?:\/\/\S+/i.test(u)) {
      setError('Pega una URL válida (http/https) del video.');
      return;
    }
    onCambio({
      url: u,
      videotecaId: undefined,
      recursoRef: undefined,
      estado: 'listo',
      hitos: config.hitos ?? [],
      transcripcion: config.transcripcion ?? [],
    });
    setReemplazando(false);
  }

  async function subirTranscripcion(file: File) {
    setError(null);
    const texto = await file.text().catch(() => '');
    const cues = parsearSubtitulos(texto);
    if (cues.length === 0) {
      setError('No se encontraron subtítulos válidos en el archivo (.vtt / .srt).');
      return;
    }
    onCambio({ ...config, transcripcion: cues });
  }

  function quitarVideo() {
    setSrc(null);
    setEnlace('');
    onCambio({ transcripcion: config.transcripcion ?? [], hitos: [] });
    setReemplazando(false);
  }

  const cambiarHitos = useCallback(
    (hitos: FuenteVideoConfig['hitos']) => onCambio({ ...config, hitos }),
    [config, onCambio],
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 py-3"
        >
          <p className="text-[12.5px] font-medium leading-relaxed text-[color:var(--destructive-foreground)]">{error}</p>
        </div>
      )}

      {tieneVideo && !reemplazando && (
        <>
          {/* Preview + timeline de hitos (mismo player del alumno) */}
          <BloqueVideo
            src={src}
            titulo={titulo}
            transcripcion={config.transcripcion}
            hitos={config.hitos}
            modo="editar"
            onCambioHitos={cambiarHitos}
          />

          {/* Estado de la fuente + reemplazar / quitar */}
          <div className={`${card} flex flex-wrap items-center gap-3 p-4`}>
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
              {config.url ? <Link2 className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Video className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-bold">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={2} />
                {config.url ? 'Video por enlace' : 'Video subido'}
                {typeof config.duracionSeg === 'number' && config.duracionSeg > 0 && (
                  <span className="font-medium text-muted-foreground">· {Math.round(config.duracionSeg)} s</span>
                )}
              </p>
              <p className={`mt-0.5 truncate text-[12px] ${softText}`}>
                {config.url ?? 'Almacenado con URL firmada del servicio de media.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReemplazando(true);
                setModoFuente(config.url ? 'enlace' : 'subir');
              }}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
            >
              <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Reemplazar
            </button>
            <button
              type="button"
              onClick={quitarVideo}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Quitar
            </button>
          </div>

          <HintHitos cuenta={config.hitos?.length ?? 0} />
          <PanelTranscripcion cuenta={config.transcripcion?.length ?? 0} onSubir={subirTranscripcion} />
        </>
      )}

      {mostrarPicker && (
        <FuenteVideo
          modo={modoFuente}
          onModo={setModoFuente}
          subiendo={subiendo}
          enlace={enlace}
          onEnlace={setEnlace}
          onArchivo={subir}
          onVincular={vincularEnlace}
          reemplazando={reemplazando}
          onCancelar={() => {
            setReemplazando(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Fuente del video (subir | enlace) ───────────────────────── */

function FuenteVideo({
  modo,
  onModo,
  subiendo,
  enlace,
  onEnlace,
  onArchivo,
  onVincular,
  reemplazando,
  onCancelar,
}: {
  modo: 'subir' | 'enlace';
  onModo: (m: 'subir' | 'enlace') => void;
  subiendo: boolean;
  enlace: string;
  onEnlace: (v: string) => void;
  onArchivo: (file: File) => void;
  onVincular: () => void;
  reemplazando: boolean;
  onCancelar: () => void;
}) {
  return (
    <div className={`${card} p-6`}>
      <div className="flex items-start gap-3.5">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground">
          <Video className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${kicker} text-muted-foreground`}>Fuente del video</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">
            {reemplazando ? 'Reemplaza la fuente del video' : 'Elige la fuente del video'}
          </h2>
          <p className={`mt-1.5 max-w-[54ch] text-[13px] leading-relaxed ${softText}`}>
            Sube el archivo o pega un enlace directo (YouTube / Stream / CDN). Después podrás marcar hitos y adjuntar la
            transcripción{reemplazando ? '; los hitos actuales se conservan.' : '.'}
          </p>
        </div>
        {reemplazando && (
          <button
            type="button"
            onClick={onCancelar}
            className={`shrink-0 rounded-[9px] border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Segmentado: Subir | Enlace */}
      <div className="mt-5 inline-flex rounded-[10px] border border-border bg-muted p-0.5">
        {(
          [
            ['subir', 'Subir archivo', Upload],
            ['enlace', 'Pegar enlace', Link2],
          ] as const
        ).map(([id, etiqueta, Icono]) => {
          const on = modo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onModo(id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-[12.5px] font-bold transition-colors ${focusRing} ${
                on ? 'bg-card text-foreground shadow-rest' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icono aria-hidden className="h-4 w-4" strokeWidth={1.9} />
              {etiqueta}
            </button>
          );
        })}
      </div>

      {modo === 'subir' ? (
        <label
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-6 py-9 text-center transition-colors hover:border-primary hover:bg-accent ${
            subiendo ? 'pointer-events-none opacity-60' : ''
          } ${focusRing}`}
        >
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={subiendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onArchivo(f);
              e.target.value = '';
            }}
          />
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
            {subiendo ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} /> : <Upload className="h-6 w-6" strokeWidth={1.6} />}
          </span>
          <span className="text-[13.5px] font-bold">
            {subiendo ? 'Subiendo el video…' : 'Elige un archivo de video (MP4, WebM…)'}
          </span>
          <span className={`text-[12px] leading-relaxed ${softText}`}>
            {subiendo
              ? 'Se está firmando la subida y registrando en la videoteca; no cierres esta pantalla.'
              : 'El archivo se sube directo al almacenamiento con una URL firmada del servicio de media.'}
          </span>
        </label>
      ) : (
        <div className="mt-4">
          <label htmlFor="video-enlace" className="text-[12.5px] font-semibold text-foreground">
            URL del video
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              id="video-enlace"
              type="url"
              value={enlace}
              onChange={(e) => onEnlace(e.target.value)}
              placeholder="https://…/video.mp4  ·  YouTube / Stream / CDN"
              className={`h-11 min-w-[220px] flex-1 rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground placeholder:text-muted-foreground ${focusRing}`}
            />
            <button
              type="button"
              onClick={onVincular}
              disabled={!enlace.trim()}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              <Link2 aria-hidden className="h-4 w-4" strokeWidth={2} />
              Vincular enlace
            </button>
          </div>
          <p className={`mt-2 text-[12px] leading-relaxed ${softText}`}>
            El enlace se reproduce tal cual (sin firmar). Útil para YouTube, Cloudflare Stream, un CDN o un origen
            externo que ya sirva el archivo.
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Hint de hitos ───────────────────────── */

function HintHitos({ cuenta }: { cuenta: number }) {
  return (
    <div className={`${card} flex items-start gap-3 p-4`}>
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold leading-snug">
          Hitos de consulta rápida{cuenta > 0 && <span className="font-medium text-muted-foreground"> · {cuenta}</span>}
        </p>
        <p className={`mt-0.5 text-[12px] leading-relaxed ${softText}`}>
          Reproduce el video y pulsa <span className="font-semibold text-foreground">“Marcar hito”</span> en la línea
          de tiempo para fijar el minuto actual; en la pestaña <span className="font-semibold text-foreground">Hitos</span>{' '}
          puedes renombrarlos o borrarlos. El alumno salta a cada uno con un click.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Panel de transcripción ───────────────────────── */

function PanelTranscripcion({ cuenta, onSubir }: { cuenta: number; onSubir: (file: File) => void }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug">Transcripción</p>
          <p className={`mt-0.5 text-[12px] leading-relaxed ${softText}`}>
            {cuenta > 0
              ? `${cuenta} segmento(s) adjuntos. Se muestran sincronizados junto al video.`
              : 'Adjunta un archivo .vtt o .srt; se sincroniza con el tiempo del video.'}
          </p>
        </div>
        <label
          className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <input
            type="file"
            accept=".vtt,.srt,text/vtt"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSubir(f);
              e.target.value = '';
            }}
          />
          <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
          {cuenta > 0 ? 'Reemplazar' : 'Subir .vtt / .srt'}
        </label>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
        <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.9} />
        <p className="text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
          La transcripción automática (Eco / worker de media) se genera al procesar el video —{' '}
          <span className="font-bold">pendiente de API</span> (§8). Por ahora se sube el archivo.
        </p>
      </div>
    </div>
  );
}
