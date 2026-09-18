'use client';

/**
 * Bloque AUDIO (§3 · §5B) — reproductor con onda visual (wavesurfer.js). Reproduce el
 * audio subido o el TTS generado por Eco/worker. Sirve en la lección (narración) y en
 * herramientas del Studio.
 *
 * Regla de Oro (§2): pieza client; la fuente (`src`) llega por URL firmada del servicio
 * de media (contrato en ../contratos.ts) y el TTS lo sintetiza el worker (POST /media/tts,
 * PENDIENTE DE API). La onda se pinta en canvas, que no entiende `var(--token)`: por eso
 * los colores del sistema (§5A) se resuelven a hex en tiempo real y respetan el tema activo
 * (claro/sepia/oscuro del modo lectura).
 */

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { AudioLines, Gauge, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';

/** Resuelve un token CSS a su valor computado (hex) para pintarlo en canvas. */
function tokenColor(nombre: string, respaldo: string): string {
  if (typeof window === 'undefined') return respaldo;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return v || respaldo;
}

function mmss(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const s = Math.floor(segundos % 60);
  const m = Math.floor(segundos / 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const VELOCIDADES = [1, 1.25, 1.5, 2] as const;

export type BloqueAudioProps = {
  /** URL firmada del audio. `null` → media/TTS pendiente. */
  src: string | null;
  /** Título del audio. */
  titulo?: string;
  /** Migaja de contexto. */
  contexto?: string;
  /** De dónde viene el audio (etiqueta + aviso de contrato si es TTS sin fuente). */
  origen?: 'subido' | 'tts';
  /** Texto base para el TTS (informativo en modo editar). */
  textoTts?: string;
};

export function BloqueAudio({ src, titulo, contexto, origen = 'subido', textoTts }: BloqueAudioProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [listo, setListo] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [duracion, setDuracion] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [velocidad, setVelocidad] = useState<(typeof VELOCIDADES)[number]>(1);

  useEffect(() => {
    if (!src || !contenedorRef.current) return;

    setListo(false);
    setReproduciendo(false);
    setTiempo(0);

    const ws = WaveSurfer.create({
      container: contenedorRef.current,
      url: src,
      height: 72,
      waveColor: tokenColor('--track', '#e8edf1'),
      progressColor: tokenColor('--secondary', '#1a8880'),
      cursorColor: tokenColor('--primary', '#53c3be'),
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
    });
    wsRef.current = ws;

    const off = [
      ws.on('ready', (d) => {
        setDuracion(d);
        setListo(true);
      }),
      ws.on('timeupdate', (t) => setTiempo(t)),
      ws.on('play', () => setReproduciendo(true)),
      ws.on('pause', () => setReproduciendo(false)),
      ws.on('finish', () => setReproduciendo(false)),
    ];

    return () => {
      off.forEach((fn) => fn());
      ws.destroy();
      wsRef.current = null;
    };
  }, [src]);

  function alternar() {
    void wsRef.current?.playPause();
  }
  function saltar(delta: number) {
    const ws = wsRef.current;
    if (!ws) return;
    const d = ws.getDuration();
    ws.setTime(Math.min(d, Math.max(0, ws.getCurrentTime() + delta)));
  }
  function cambiarVelocidad() {
    const i = VELOCIDADES.indexOf(velocidad);
    const siguiente = VELOCIDADES[(i + 1) % VELOCIDADES.length];
    setVelocidad(siguiente);
    wsRef.current?.setPlaybackRate(siguiente, true);
  }

  if (!src) {
    return <PendienteAudio titulo={titulo} contexto={contexto} origen={origen} textoTts={textoTts} />;
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <AudioLines className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          {titulo && <span className="block truncate text-[14px] font-bold leading-snug">{titulo}</span>}
          {contexto && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contexto}</span>}
        </span>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-[11px] font-bold text-muted-foreground">
          {origen === 'tts' ? 'Narración TTS' : 'Audio subido'}
        </span>
      </div>

      {/* Onda */}
      <div className="relative px-5 py-4">
        <div ref={contenedorRef} className="w-full" aria-label="Onda del audio" role="img" />
        {!listo && (
          <div className="absolute inset-0 grid place-items-center">
            <span className={`${mono} text-[11px] text-muted-foreground`}>cargando onda…</span>
          </div>
        )}
      </div>

      {/* Controles personalizados (§5A) */}
      <div className="flex items-center gap-2.5 border-t border-border bg-muted px-5 py-3.5">
        <button
          type="button"
          onClick={alternar}
          disabled={!listo}
          aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
        >
          {reproduciendo ? <Pause className="h-5 w-5" strokeWidth={2.2} /> : <Play className="h-5 w-5" strokeWidth={2.2} />}
        </button>
        <button
          type="button"
          onClick={() => saltar(-10)}
          disabled={!listo}
          aria-label="Retroceder 10 segundos"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={() => saltar(10)}
          disabled={!listo}
          aria-label="Adelantar 10 segundos"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
        >
          <RotateCw className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <span className={`${mono} ml-1 text-[12px] text-muted-foreground`}>
          {mmss(tiempo)} / {mmss(duracion)}
        </span>
        <button
          type="button"
          onClick={cambiarVelocidad}
          disabled={!listo}
          aria-label={`Velocidad ${velocidad}x`}
          className={`ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
        >
          <Gauge aria-hidden className="h-4 w-4" strokeWidth={1.9} />
          <span className={mono}>{velocidad}x</span>
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Estado: audio/TTS pendiente ───────────────────────── */

function PendienteAudio({
  titulo,
  contexto,
  origen,
  textoTts,
}: {
  titulo?: string;
  contexto?: string;
  origen: 'subido' | 'tts';
  textoTts?: string;
}) {
  const esTts = origen === 'tts';
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-muted text-muted-foreground">
          <AudioLines className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          {titulo && <span className="block truncate text-[14px] font-bold leading-snug">{titulo}</span>}
          {contexto && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contexto}</span>}
        </span>
      </div>
      {esTts && textoTts && (
        <div className="border-b border-border px-5 py-3">
          <p className={`${kicker} text-muted-foreground`}>Texto de la narración</p>
          <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>{textoTts}</p>
        </div>
      )}
      <div className="flex items-start gap-3 bg-[color:var(--info-surface)] px-5 py-3.5">
        <AudioLines aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          {esTts ? (
            <>
              Narración por síntesis de voz —{' '}
              <span className="font-bold">pendiente de API</span> (POST /media/tts → URL firmada del audio).
            </>
          ) : (
            <>
              Audio sin fuente vinculada. Se sirve por URL firmada del servicio de media —{' '}
              <span className="font-bold">pendiente de API</span> (GET /media/url).
            </>
          )}
        </p>
      </div>
    </div>
  );
}
