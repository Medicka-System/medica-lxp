'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ImageOff, Film, Maximize2, Minimize2, Ruler, Trash2, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HerramientaId } from './herramientas';
import type { MotorVisor } from './motor';
import type { EstudioDicom } from './types';
import { useVisorDicom } from './use-visor-dicom';
import { useAnotaciones, etiquetaTipo, type ConfigAnotaciones } from './use-anotaciones';
import { BarraHerramientas, ControlesCine } from './toolbar';

export interface VisorDicomProps {
  /** Estudio ya parseado y **anonimizado** (ver `types.ts` para el contrato). */
  estudio: EstudioDicom;
  /** Serie inicial por id (default: primera). */
  serieInicial?: string;
  /** Herramienta activa inicial. */
  herramientaInicial?: HerramientaId;
  /**
   * Fábrica del motor de render. Por defecto carga Cornerstone3D de forma
   * dinámica (solo cliente). Se sobreescribe en tests con un doble.
   */
  crearMotor?: () => MotorVisor | Promise<MotorVisor>;
  /** Modo miniatura/consulta: sin medición/anotación (p. ej. Ateneo, §5). */
  soloLectura?: boolean;
  /** Oculta el selector de series (una sola serie o miniatura). */
  ocultarSeries?: boolean;
  /**
   * Dónde va el selector de series: rail vertical a la izquierda (default) o TIRA
   * horizontal debajo del visor (§ detalle de caso — el visor manda a lo ancho).
   */
  seriesLayout?: 'vertical' | 'horizontal';
  /** Clase para el contenedor externo (alto/ancho). */
  className?: string;
  onHerramientaChange?: (id: HerramientaId) => void;
  /**
   * Persistencia de mediciones/anotaciones (FASE 2). Si se pasa, el visor carga las
   * guardadas al abrir y auto-guarda las del usuario; en curados (`congelado`) se ven
   * pero no se guardan. Sin este prop, las anotaciones son efímeras (sesión).
   */
  anotaciones?: ConfigAnotaciones;
}

/** Fábrica por defecto: importa el motor Cornerstone3D solo en el cliente. */
async function crearMotorPorDefecto(): Promise<MotorVisor> {
  const mod = await import('./engine/motor-cornerstone');
  return mod.crearMotorCornerstone();
}

/**
 * `VisorDicom` — visor de estudios DICOM con Cornerstone3D (§4.7).
 * Reproduce cine-loops multi-frame, navega series y permite medir/anotar.
 * Interfaz por props para embeberlo en bitácora, Ateneo, Biblioteca y editor
 * de caso (§4.7 paso 4). Toda interacción con la librería pasa por `MotorVisor`.
 */
export function VisorDicom({
  estudio,
  serieInicial,
  herramientaInicial,
  crearMotor = crearMotorPorDefecto,
  soloLectura = false,
  ocultarSeries = false,
  seriesLayout = 'vertical',
  className,
  onHerramientaChange,
  anotaciones,
}: VisorDicomProps) {
  const [loop, setLoop] = useState(true);
  const [velocidad, setVelocidad] = useState(1);
  const contenedorExtRef = useRef<HTMLDivElement | null>(null);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const alternarPantallaCompleta = useCallback(() => {
    const el = contenedorExtRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onCambio = () => setPantallaCompleta(document.fullscreenElement === contenedorExtRef.current);
    document.addEventListener('fullscreenchange', onCambio);
    return () => document.removeEventListener('fullscreenchange', onCambio);
  }, []);

  const visor = useVisorDicom({
    estudio,
    crearMotor,
    serieInicial,
    herramientaInicial,
    loop,
    velocidad,
    onHerramientaChange,
  });

  const {
    contenedorRef,
    series,
    serieActiva,
    serieActivaId,
    seleccionarSerie,
    herramienta,
    activarHerramienta,
    limpiarAnotaciones,
    reencuadrar,
    cine,
    esCine,
    listo,
    error,
  } = visor;

  // Persistencia de mediciones (FASE 2): carga/guarda; congelado en curados.
  const persistencia = useAnotaciones(estudio, listo, visor.anotaciones, anotaciones);

  if (!serieActiva) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground',
          className,
        )}
      >
        <ImageOff size={28} strokeWidth={1.5} />
        <p className="text-[13px] font-semibold">Sin imágenes DICOM</p>
      </div>
    );
  }

  const total = serieActiva.frames.length;
  const mostrarSeries = !ocultarSeries && series.length > 1;
  const seriesHorizontal = mostrarSeries && seriesLayout === 'horizontal';
  const seriesVertical = mostrarSeries && seriesLayout === 'vertical';

  return (
    <div
      ref={contenedorExtRef}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-rest',
        pantallaCompleta && 'h-screen w-screen rounded-none',
        className,
      )}
    >
      {!soloLectura && (
        <BarraHerramientas
          activa={herramienta}
          onSeleccionar={activarHerramienta}
          onLimpiar={limpiarAnotaciones}
          onReencuadrar={reencuadrar}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {seriesVertical && (
          <SelectorSeries
            series={series}
            activaId={serieActivaId}
            onSeleccionar={seleccionarSerie}
            orientacion="vertical"
          />
        )}

        <div className="relative flex min-h-[280px] flex-1 items-center justify-center bg-[#1A1A1A]">
          {/* Stage del motor. Fondo gris profundo (nunca negro puro, §5A). */}
          <div
            ref={contenedorRef}
            data-testid="visor-stage"
            className="absolute inset-0 h-full w-full"
            /* Cornerstone bloquea el menú contextual del clic derecho (zoom). */
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Overlay de metadatos (esquina superior izquierda). */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1">
            <span className="rounded-pill bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white/90">
              {serieActiva.descripcion}
            </span>
            <span className="w-fit rounded-pill bg-black/45 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/70">
              {serieActiva.modalidad}
              {esCine && ` · ${total} frames`}
            </span>
          </div>

          {esCine && (
            <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-pill bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
              <Film size={11} strokeWidth={2} /> Cine
            </span>
          )}

          {/* Pantalla completa — el visor es la herramienta de trabajo del médico. */}
          <button
            type="button"
            onClick={alternarPantallaCompleta}
            aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="absolute bottom-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white/85 transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {pantallaCompleta ? (
              <Minimize2 size={16} strokeWidth={2} />
            ) : (
              <Maximize2 size={16} strokeWidth={2} />
            )}
          </button>

          {!listo && !error && (
            <div className="z-10 flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="animate-spin" size={26} strokeWidth={1.75} />
              <span className="text-[12px] font-medium">Cargando estudio…</span>
            </div>
          )}

          {error && (
            <div className="z-10 flex max-w-xs flex-col items-center gap-1.5 px-4 text-center text-white/80">
              <ImageOff size={26} strokeWidth={1.5} />
              <span className="text-[12px] font-semibold">No se pudo mostrar el estudio</span>
              <span className="text-[11px] text-white/55">{error}</span>
            </div>
          )}
        </div>
      </div>

      {esCine && (
        <ControlesCine
          cine={cine}
          total={total}
          loop={loop}
          onToggleLoop={() => setLoop((v) => !v)}
          velocidad={velocidad}
          onVelocidad={setVelocidad}
        />
      )}

      {seriesHorizontal && (
        <SelectorSeries
          series={series}
          activaId={serieActivaId}
          onSeleccionar={seleccionarSerie}
          orientacion="horizontal"
        />
      )}

      {persistencia.activo && (
        <PanelMediciones
          lista={persistencia.lista}
          guardado={persistencia.guardado}
          congelado={persistencia.congelado}
          onEliminar={persistencia.eliminar}
        />
      )}
    </div>
  );
}

/** Panel de mediciones guardadas (FASE 2): lista con autor/valor y estado de guardado. */
function PanelMediciones({
  lista,
  guardado,
  congelado,
  onEliminar,
}: {
  lista: ReturnType<typeof useAnotaciones>['lista'];
  guardado: ReturnType<typeof useAnotaciones>['guardado'];
  congelado: boolean;
  onEliminar: (uid: string) => void;
}) {
  return (
    <div className="border-t border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Ruler size={15} strokeWidth={1.75} className="text-muted-foreground" />
        <span className="text-[12px] font-semibold">Mediciones</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{lista.length}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium">
          {congelado ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Lock size={12} strokeWidth={2} /> Curado · no se guarda
            </span>
          ) : guardado === 'guardando' ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 size={12} strokeWidth={2} className="animate-spin" /> Guardando…
            </span>
          ) : guardado === 'guardado' ? (
            <span className="inline-flex items-center gap-1 text-secondary">
              <Check size={13} strokeWidth={2.5} /> Guardado
            </span>
          ) : guardado === 'error' ? (
            <span className="text-destructive">No se pudo guardar</span>
          ) : null}
        </span>
      </div>

      {lista.length > 0 && (
        <ul className="max-h-[132px] overflow-y-auto border-t border-border">
          {lista.map((m) => (
            <li key={m.uid} className="flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent">
              <span className="font-semibold">{etiquetaTipo(m.tipo)}</span>
              {m.valor && <span className="font-mono tabular-nums text-secondary">{m.valor}</span>}
              <span className="ml-auto truncate text-[11px] text-muted-foreground">{m.autor}</span>
              {m.esMia && !congelado && (
                <button
                  type="button"
                  aria-label="Borrar medición"
                  onClick={() => onEliminar(m.uid)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SelectorSeriesProps {
  series: EstudioDicom['series'];
  activaId: string;
  onSeleccionar: (id: string) => void;
  orientacion?: 'vertical' | 'horizontal';
}

/**
 * Selector de series (miniaturas). `vertical` = rail a la izquierda (visor embebido);
 * `horizontal` = TIRA debajo del visor (§ detalle de caso — fiel al mock: el visor
 * manda a lo ancho y las series se navegan como una tira de estudio).
 */
function SelectorSeries({
  series,
  activaId,
  onSeleccionar,
  orientacion = 'vertical',
}: SelectorSeriesProps) {
  const horizontal = orientacion === 'horizontal';
  return (
    <div
      role="tablist"
      aria-label="Series del estudio"
      className={cn(
        'flex bg-card',
        horizontal
          ? 'w-full shrink-0 flex-row gap-2 overflow-x-auto border-t border-border p-2.5'
          : 'w-[104px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border p-2',
      )}
    >
      {series.map((s, i) => {
        const activa = s.id === activaId;
        return (
          <button
            // Key única garantizada: aunque el id se repitiera (SeriesInstanceUID duplicado
            // entre instancias de una misma serie), el índice la desambigua y React no choca.
            key={`${s.id}-${i}`}
            role="tab"
            aria-selected={activa}
            type="button"
            onClick={() => onSeleccionar(s.id)}
            className={cn(
              'group flex flex-col gap-1 rounded-control border p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              horizontal ? 'w-[104px] shrink-0' : '',
              activa
                ? 'border-primary bg-accent'
                : 'border-border hover:border-secondary/40 hover:bg-accent',
            )}
          >
            <div
              className={cn(
                'relative flex items-center justify-center overflow-hidden rounded-[7px] bg-[#1A1A1A]',
                horizontal ? 'aspect-video' : 'aspect-square',
              )}
            >
              {s.miniaturaUrl ? (
                // Miniatura simple desde object storage; no requiere next/image.
                <img src={s.miniaturaUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Film size={18} strokeWidth={1.5} className="text-white/40" />
              )}
              {s.frames.length > 1 && (
                <span className="absolute bottom-0.5 right-0.5 rounded-pill bg-black/55 px-1 font-mono text-[9px] text-white/80">
                  {s.frames.length}
                </span>
              )}
            </div>
            <span
              className={cn(
                'truncate text-[10px] font-semibold',
                activa ? 'text-secondary' : 'text-muted-foreground',
              )}
            >
              {s.descripcion}
            </span>
          </button>
        );
      })}
    </div>
  );
}
