'use client';

/**
 * Editor de la LECCIÓN tipo VIDEO (§5C · mig 0023). La lección ES un video: ocupa toda
 * la lección (no es un bloque dentro de teoría). El diseñador sube el video/cine-loop,
 * marca HITOS de consulta rápida sobre la línea de tiempo y adjunta la TRANSCRIPCIÓN.
 *
 * Reusa `BloqueVideo` (Vidstack · §3) en modo `editar` para el player + hitos. La
 * persistencia es la CONFIG de la lección (`lecciones.config`, contrato §5C):
 *   { videotecaId, recursoRef, estado, duracionSeg, hitos[], transcripcion[] }
 *
 * Reparto (§2 · Regla de Oro):
 *   · firmar subida/lectura del binario → dominio (`media-acciones` → apps/api);
 *   · el binario viaja navegador → object storage (PUT firmado), nunca por el web/api;
 *   · la config (hitos, transcripción, video listo) → CRUD directo web→Supabase (RLS).
 *
 * La transcripción AUTOMÁTICA es del worker (§8 · pendiente de API); aquí el diseñador
 * SUBE su `.vtt/.srt` (se parsea en cliente) — camino que ya funciona sin backend.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Sparkles, Trash2, Upload, Video } from 'lucide-react';
import { card, focusRing, kicker, softText } from '@/lib/studio/estilos';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import type { CueTranscripcion, HitoVideo } from '@/components/bloques/contratos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';
import {
  confirmarVideo,
  solicitarSubidaVideo,
  urlReproduccionVideo,
} from '@/lib/studio/media-acciones';
import { parsearSubtitulos } from '@/lib/studio/subtitulos';

/** Forma de la config de una lección VIDEO (la posee este editor · §5C). */
type ConfigVideo = {
  videotecaId?: string;
  recursoRef?: string;
  estado?: 'procesando' | 'listo';
  duracionSeg?: number;
  hitos?: HitoVideo[];
  transcripcion?: CueTranscripcion[];
};

/** Normaliza el jsonb crudo de `lecciones.config` a `ConfigVideo` con defaults seguros. */
function normalizar(config: Record<string, unknown>): ConfigVideo {
  const c = config as ConfigVideo;
  return {
    videotecaId: typeof c.videotecaId === 'string' ? c.videotecaId : undefined,
    recursoRef: typeof c.recursoRef === 'string' ? c.recursoRef : undefined,
    estado: c.estado === 'listo' || c.estado === 'procesando' ? c.estado : undefined,
    duracionSeg: typeof c.duracionSeg === 'number' ? c.duracionSeg : undefined,
    hitos: Array.isArray(c.hitos) ? c.hitos : [],
    transcripcion: Array.isArray(c.transcripcion) ? c.transcripcion : [],
  };
}

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

export function EditorVideo({ programaId, leccionId, titulo, config, correr }: EditorLeccionProps) {
  const [cfg, setCfg] = useState<ConfigVideo>(() => normalizar(config));
  const [src, setSrc] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tieneVideo = cfg.estado === 'listo' && !!cfg.videotecaId;

  /** Persiste la config completa (la lección es mono-tipo: sin contención de claves). */
  const persistir = useCallback(
    (nueva: ConfigVideo) => {
      setCfg(nueva);
      correr(() => guardarConfigLeccion(programaId, leccionId, nueva as Record<string, unknown>));
    },
    [correr, programaId, leccionId],
  );

  // Firma una URL de lectura para previsualizar el video ya subido (vida corta).
  useEffect(() => {
    let vivo = true;
    if (!tieneVideo || !cfg.videotecaId) {
      setSrc(null);
      return;
    }
    urlReproduccionVideo(cfg.videotecaId).then((r) => {
      if (!vivo) return;
      if (r.ok) setSrc(r.datos.urlReproduccion);
      else setSrc(null);
    });
    return () => {
      vivo = false;
    };
  }, [tieneVideo, cfg.videotecaId]);

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
      persistir({
        videotecaId: sol.datos.videotecaId,
        recursoRef: sol.datos.recursoRef,
        estado: 'listo',
        duracionSeg,
        hitos: [],
        transcripcion: cfg.transcripcion ?? [],
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function subirTranscripcion(file: File) {
    setError(null);
    const texto = await file.text().catch(() => '');
    const cues = parsearSubtitulos(texto);
    if (cues.length === 0) {
      setError('No se encontraron subtítulos válidos en el archivo (.vtt / .srt).');
      return;
    }
    persistir({ ...cfg, transcripcion: cues });
  }

  function quitarVideo() {
    setSrc(null);
    persistir({ transcripcion: cfg.transcripcion ?? [], hitos: [] });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 py-3"
        >
          <p className="text-[12.5px] font-medium leading-relaxed text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        </div>
      )}

      {tieneVideo ? (
        <>
          <BloqueVideo
            src={src}
            titulo={titulo}
            transcripcion={cfg.transcripcion}
            hitos={cfg.hitos}
            modo="editar"
            onCambioHitos={(hitos) => persistir({ ...cfg, hitos })}
          />

          <PanelTranscripcion
            cuenta={cfg.transcripcion?.length ?? 0}
            onSubir={subirTranscripcion}
          />

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-secondary">
              <CheckCircle2 aria-hidden className="h-4 w-4" strokeWidth={2} />
              Video vinculado
              {typeof cfg.duracionSeg === 'number' && cfg.duracionSeg > 0 && (
                <span className="text-muted-foreground">· {Math.round(cfg.duracionSeg)} s</span>
              )}
            </span>
            <button
              type="button"
              onClick={quitarVideo}
              className={`ml-auto inline-flex h-9 items-center gap-2 rounded-[9px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Quitar video
            </button>
          </div>
        </>
      ) : (
        <ZonaSubidaVideo subiendo={subiendo} onArchivo={subir} />
      )}
    </div>
  );
}

/* ───────────────────────── Zona de subida del video ───────────────────────── */

function ZonaSubidaVideo({
  subiendo,
  onArchivo,
}: {
  subiendo: boolean;
  onArchivo: (file: File) => void;
}) {
  return (
    <div className={`${card} p-6`}>
      <div className="flex items-start gap-3.5">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground">
          <Video className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo Video</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">
            Sube el video o cine-loop de esta lección
          </h2>
          <p className={`mt-1.5 max-w-[54ch] text-[13px] leading-relaxed ${softText}`}>
            El video ocupa toda la lección. Tras subirlo podrás marcar hitos de consulta rápida y
            adjuntar la transcripción.
          </p>
        </div>
      </div>

      <label
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-6 py-9 text-center transition-colors hover:border-primary hover:bg-accent ${
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
          {subiendo ? (
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
          ) : (
            <Upload className="h-6 w-6" strokeWidth={1.6} />
          )}
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
    </div>
  );
}

/* ───────────────────────── Panel de transcripción ───────────────────────── */

function PanelTranscripcion({
  cuenta,
  onSubir,
}: {
  cuenta: number;
  onSubir: (file: File) => void;
}) {
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
