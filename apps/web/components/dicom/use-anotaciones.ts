'use client';

/**
 * Orquesta la PERSISTENCIA de mediciones/anotaciones del visor (§4.7 · FASE 2).
 *
 * Al abrir el estudio: carga las anotaciones guardadas, re-liga cada una a su `imageId`
 * de la sesión actual (por serie+frame, porque la URL firmada cambia) y las restaura en
 * el motor — bloqueadas las de otro autor o de un estudio CURADO. Mientras el usuario
 * mide, auto-guarda (debounced) su propio set. En curados NO guarda: están congelados.
 *
 * El motor (Cornerstone) mantiene el estado en JSON; aquí solo se mapea serie/frame ↔
 * imageId y se llama a las server actions (RLS decide quién escribe). No reinventa nada.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnotacionesApi } from './use-visor-dicom';
import type { EstudioDicom } from './types';

/** Una anotación cargada desde la persistencia (server action). */
export interface AnotacionExterna {
  id: string;
  serie: number;
  frame: number;
  tipo: string;
  datos: Record<string, unknown>;
  valor: string | null;
  autorNombre: string;
  esMia: boolean;
}

/** Config de persistencia que provee el contenedor (VisorEstudio → server actions). */
export interface ConfigAnotaciones {
  /** Estudio curado (biblioteca): se ven pero NO se guardan las nuevas. */
  congelado: boolean;
  cargar: () => Promise<AnotacionExterna[]>;
  guardar: (
    items: { serie: number; frame: number; tipo: string; datos: Record<string, unknown>; valor: string | null }[],
  ) => Promise<void>;
}

/** Fila del panel de mediciones. */
export interface ItemAnotacion {
  uid: string;
  tipo: string;
  valor: string | null;
  autor: string;
  esMia: boolean;
}

export type EstadoGuardado = 'idle' | 'guardando' | 'guardado' | 'error';

/** Etiqueta legible de cada herramienta (para el panel). */
const ETIQUETA: Record<string, string> = {
  Length: 'Distancia',
  Angle: 'Ángulo',
  EllipticalROI: 'Elipse',
  RectangleROI: 'Rectángulo',
  Probe: 'Punto',
  ArrowAnnotate: 'Nota',
};

export function etiquetaTipo(tipo: string): string {
  return ETIQUETA[tipo] ?? tipo;
}

interface DatosAnotacion {
  annotationUID?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  invalidated?: boolean;
}

export function useAnotaciones(
  estudio: EstudioDicom,
  listo: boolean,
  api: AnotacionesApi,
  config: ConfigAnotaciones | undefined,
): {
  lista: ItemAnotacion[];
  guardado: EstadoGuardado;
  eliminar: (uid: string) => void;
  congelado: boolean;
  activo: boolean;
} {
  const [lista, setLista] = useState<ItemAnotacion[]>([]);
  const [guardado, setGuardado] = useState<EstadoGuardado>('idle');

  // Mapa imageId ↔ (serie, frame) de ESTA sesión (la URL firmada cambia por apertura).
  const { porImageId, imageIdDe } = useMemo(() => {
    const map = new Map<string, { serie: number; frame: number }>();
    estudio.series.forEach((s, si) =>
      s.frames.forEach((f, fi) => map.set(f.imageId, { serie: si, frame: fi })),
    );
    const de = (serie: number, frame: number): string | undefined =>
      estudio.series[serie]?.frames[frame]?.imageId;
    return { porImageId: map, imageIdDe: de };
  }, [estudio]);

  // Autor por annotationUID (para el panel); refs para no re-crear el efecto.
  const autorPorUid = useRef(new Map<string, string>());
  const configRef = useRef(config);
  configRef.current = config;
  const apiRef = useRef(api);
  apiRef.current = api;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refrescarLista = useCallback(() => {
    const anots = apiRef.current.serializar();
    setLista(
      anots.map((a) => ({
        uid: a.annotationUID,
        tipo: a.toolName,
        valor: a.valor,
        autor: autorPorUid.current.get(a.annotationUID) ?? 'Tú',
        esMia: !a.bloqueada,
      })),
    );
  }, []);

  const guardarAhora = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || cfg.congelado) return; // curado: no se persiste
    setGuardado('guardando');
    try {
      const items = apiRef.current
        .serializar()
        .filter((a) => !a.bloqueada) // solo las mías (las de otros van bloqueadas)
        .map((a) => {
          const loc = a.referencedImageId ? porImageId.get(a.referencedImageId) : null;
          if (!loc) return null;
          return { serie: loc.serie, frame: loc.frame, tipo: a.toolName, datos: a.datos, valor: a.valor };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      await cfg.guardar(items);
      setGuardado('guardado');
    } catch {
      setGuardado('error');
    }
  }, [porImageId]);

  // Al cambiar una anotación (completar/modificar/borrar): refresca panel + debounced save.
  const programar = useCallback(() => {
    refrescarLista();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void guardarAhora(), 800);
  }, [refrescarLista, guardarAhora]);

  // Carga + restauración UNA vez cuando el motor está listo; suscripción a cambios.
  const restauradoRef = useRef(false);
  useEffect(() => {
    if (!listo || !config || restauradoRef.current) return;
    restauradoRef.current = true;
    let vivo = true;
    let desuscribir: (() => void) | undefined;
    const apiActual = apiRef.current;

    (async () => {
      apiActual.limpiar(); // pizarra limpia por caso (el estado de anotaciones es global)
      const externas = await config.cargar().catch(() => [] as AnotacionExterna[]);
      if (!vivo) return;
      autorPorUid.current.clear();
      const restaurar = externas
        .map((e) => {
          const imageId = imageIdDe(e.serie, e.frame);
          if (!imageId) return null;
          const datos = e.datos as DatosAnotacion;
          // Re-liga a la URL firmada de ESTA sesión (la geometría en coords de mundo y el
          // valor en `cachedStats` se conservan). `invalidated` fuerza a Cornerstone a
          // redibujar y recalcular para el target actual.
          datos.metadata = { ...(datos.metadata ?? {}), referencedImageId: imageId };
          datos.invalidated = true;
          if (datos.annotationUID) autorPorUid.current.set(datos.annotationUID, e.esMia ? 'Tú' : e.autorNombre);
          return { datos: datos as Record<string, unknown>, bloqueada: !e.esMia || config.congelado };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

      apiActual.restaurar(restaurar);
      refrescarLista();
      // Siempre refresca el panel al medir; el guardado se salta si es curado (congelado).
      desuscribir = apiActual.onCambio(programar);
    })();

    return () => {
      vivo = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      desuscribir?.();
      restauradoRef.current = false;
      apiActual.limpiar(); // limpia el estado global al cerrar el estudio
    };
  }, [listo, config, imageIdDe, programar, refrescarLista]);

  const eliminar = useCallback(
    (uid: string) => {
      apiRef.current.borrar(uid); // dispara ANNOTATION_REMOVED → programar() guarda + refresca
      if (configRef.current?.congelado) refrescarLista();
    },
    [refrescarLista],
  );

  return { lista, guardado, eliminar, congelado: config?.congelado ?? false, activo: !!config };
}
