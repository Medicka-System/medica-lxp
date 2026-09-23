'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HERRAMIENTA_POR_DEFECTO, type HerramientaId } from './herramientas';
import type { MotorVisor } from './motor';
import { esCineLoop, fpsEfectivo, type EstudioDicom, type SerieDicom } from './types';
import { useCineLoop, type CineLoop } from './use-cine-loop';

export interface UseVisorDicomOpts {
  estudio: EstudioDicom;
  /**
   * Fábrica del motor de render. Se inyecta para poder testear sin WebGL.
   * En producción, el componente pasa el motor Cornerstone3D (cliente).
   */
  crearMotor: () => MotorVisor | Promise<MotorVisor>;
  /** Serie inicial (id o índice). Default: primera serie. */
  serieInicial?: string;
  herramientaInicial?: HerramientaId;
  /** Reproducir el cine-loop en bucle (default true). */
  loop?: boolean;
  /** Multiplicador de velocidad del cine sobre los fps base (default 1). */
  velocidad?: number;
  /** Notifica al padre qué herramienta quedó activa. */
  onHerramientaChange?: (id: HerramientaId) => void;
}

export interface VisorDicomEstado {
  /** Ref callback para el contenedor del canvas del motor. */
  contenedorRef: (el: HTMLDivElement | null) => void;
  series: SerieDicom[];
  serieActiva: SerieDicom;
  serieActivaId: string;
  seleccionarSerie: (id: string) => void;
  herramienta: HerramientaId;
  activarHerramienta: (id: HerramientaId) => void;
  limpiarAnotaciones: () => void;
  reencuadrar: () => void;
  cine: CineLoop;
  esCine: boolean;
  /** El motor terminó de montar y cargó la primera serie. */
  listo: boolean;
  /** Mensaje de error si el motor falló al montar/cargar. */
  error: string | null;
}

/**
 * Orquesta el visor: ciclo de vida del motor, selección de series, herramienta
 * activa y el cine-loop. Toda la interacción con Cornerstone3D pasa por
 * `MotorVisor` (inyectable) — este hook no importa la librería.
 */
export function useVisorDicom({
  estudio,
  crearMotor,
  serieInicial,
  herramientaInicial = HERRAMIENTA_POR_DEFECTO,
  loop = true,
  velocidad = 1,
  onHerramientaChange,
}: UseVisorDicomOpts): VisorDicomEstado {
  const series = estudio.series;

  const indiceSerieInicial = Math.max(
    0,
    series.findIndex((s) => s.id === serieInicial),
  );
  const [serieActivaId, setSerieActivaId] = useState(
    series[indiceSerieInicial]?.id ?? series[0]?.id ?? '',
  );
  const serieActiva = useMemo(
    () => series.find((s) => s.id === serieActivaId) ?? series[0],
    [series, serieActivaId],
  );

  const [herramienta, setHerramienta] = useState<HerramientaId>(herramientaInicial);
  const [motorListo, setMotorListo] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motorRef = useRef<MotorVisor | null>(null);
  const elementoRef = useRef<HTMLDivElement | null>(null);
  const montadoRef = useRef(false);

  // --- Cine-loop: mueve el frame del motor visible. ---
  const total = serieActiva?.frames.length ?? 0;
  const onFrame = useCallback((indice: number) => {
    motorRef.current?.mostrarFrame(indice);
  }, []);
  // fps efectivo = fps base de la serie × multiplicador de velocidad (acotado sano).
  const fps = fpsEfectivo(serieActiva ?? {}) * (Number.isFinite(velocidad) && velocidad > 0 ? velocidad : 1);
  const cine = useCineLoop({ total, fps, loop, onFrame });

  // --- Montaje del motor cuando el contenedor está disponible. ---
  const montar = useCallback(
    async (el: HTMLDivElement) => {
      if (montadoRef.current) return;
      montadoRef.current = true;
      try {
        const motor = await crearMotor();
        motorRef.current = motor;
        await motor.montar(el);
        motor.activarHerramienta(herramientaInicial);
        setError(null);
        setMotorListo(true);
      } catch (e) {
        montadoRef.current = false;
        setError(e instanceof Error ? e.message : 'No se pudo iniciar el visor');
      }
    },
    [crearMotor, herramientaInicial],
  );

  const contenedorRef = useCallback(
    (el: HTMLDivElement | null) => {
      elementoRef.current = el;
      if (el) void montar(el);
    },
    [montar],
  );

  // imageIds ordenados de la serie activa + firma estable (evita recargas por
  // re-render del padre con un estudio de igual contenido pero nueva identidad).
  const imageIds = useMemo(
    () =>
      (serieActiva?.frames ?? [])
        .slice()
        .sort((a, b) => a.indice - b.indice)
        .map((f) => f.imageId),
    [serieActiva],
  );
  const firmaSerie = imageIds.join('|');

  // --- Carga de la serie activa en el motor (tras montar y al cambiar serie). ---
  useEffect(() => {
    let vivo = true;
    const motor = motorRef.current;
    if (!motor || !motorListo || imageIds.length === 0) return;
    setListo(false);
    motor
      .cargarSerie(imageIds, 0)
      .then(() => {
        if (vivo) setListo(true);
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudo cargar la serie');
      });
    return () => {
      vivo = false;
    };
    // Re-corre al cambiar el contenido de la serie (firma) o cuando el motor
    // monta. `imageIds` deriva de `firmaSerie`, por eso no se lista aparte.
  }, [firmaSerie, motorListo]);

  // --- Limpieza al desmontar. ---
  useEffect(() => {
    return () => {
      motorRef.current?.destruir();
      motorRef.current = null;
      montadoRef.current = false;
    };
  }, []);

  const seleccionarSerie = useCallback(
    (id: string) => {
      if (id !== serieActivaId && series.some((s) => s.id === id)) {
        cine.pausar();
        setSerieActivaId(id);
      }
    },
    [serieActivaId, series, cine],
  );

  const activarHerramienta = useCallback(
    (id: HerramientaId) => {
      setHerramienta(id);
      motorRef.current?.activarHerramienta(id);
      onHerramientaChange?.(id);
    },
    [onHerramientaChange],
  );

  const limpiarAnotaciones = useCallback(() => {
    motorRef.current?.limpiarAnotaciones();
  }, []);

  const reencuadrar = useCallback(() => {
    motorRef.current?.reencuadrar();
  }, []);

  return {
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
    esCine: serieActiva ? esCineLoop(serieActiva) : false,
    listo,
    error,
  };
}
