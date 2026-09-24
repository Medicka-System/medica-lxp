/**
 * Tipos de entrada del `VisorDicom` (§4.7, §5A del CLAUDE.md).
 *
 * IMPORTANTE — formato de entrada (contrato):
 * El visor NO parsea DICOM binario. El parseo real (dcmjs / dicom-parser /
 * DICOMweb) está **por decidir** y vive en el pipeline de ingesta del `api`
 * (`procesar-dicom`, §8) + anonimización obligatoria. Este componente recibe
 * un estudio **ya parseado y anonimizado**: una lista de series, cada una con
 * sus frames referenciados por `imageId` (un id opaco que el motor sabe cargar).
 *
 * Convención de `imageId` (la resuelve el motor, no la UI):
 *   - Archivo DICOM único vía URL firmada:   `wadouri:https://storage/…/frame.dcm`
 *   - Frame N de un multi-frame:             `wadouri:https://storage/…/estudio.dcm?frame=N`
 *   - DICOMweb (WADO-RS):                     `wadors:https://…/frames/N`
 *   - Mock/tests (sin red):                   `mock:serie-1/frame-0`
 *
 * Para un cine-loop, la ingesta produce **un `imageId` por frame** y los ordena.
 * Una imagen estática es simplemente una serie con un único frame.
 */

/** Un frame individual dentro de una serie (una imagen del stack). */
export interface FrameDicom {
  /** Id opaco que el motor sabe cargar (ver convención arriba). */
  imageId: string;
  /** Posición del frame dentro de la serie (0-based). */
  indice: number;
}

/**
 * Una serie DICOM: 1 frame = imagen estática; >1 frame = cine-loop.
 * Metadatos ya **anonimizados** (nunca PII del paciente, §10).
 */
export interface SerieDicom {
  id: string;
  /** Descripción legible (p. ej. "Abdomen — Longitudinal"). */
  descripcion: string;
  /** Modalidad DICOM (para POCUS casi siempre "US"). */
  modalidad: string;
  /**
   * `dicom` (loader wadouri: cine, mm reales, aspect ratio, auto-encuadre) o `imagen`
   * (JPG/PNG por el web loader: SIN calibración, sin medición en mm · §3). Default `dicom`.
   */
  tipo?: 'dicom' | 'imagen';
  /** Frames ordenados. Longitud 1 = estática; >1 = multi-frame/cine. */
  frames: FrameDicom[];
  /** Cuadros por segundo del cine-loop (default 30 si se omite). */
  fps?: number;
  /** URL de miniatura opcional para el selector de series. */
  miniaturaUrl?: string;
  /** Metadatos anonimizados opcionales para overlays (ancho ventana, etc.). */
  metadatos?: Record<string, string | number | undefined>;
  /**
   * Caja `[x0, y0, x1, y1]` (px de la imagen) de la región de ultrasonido — la zona
   * clínica, sin las bandas negras del chrome del ecógrafo. Si está, el visor AUTO-ENCUADRA
   * a ella al cargar la serie para que la imagen clínica llene el viewport (§5A).
   */
  regionUS?: [number, number, number, number];
}

/** Estudio = conjunto de series de un mismo caso. */
export interface EstudioDicom {
  id: string;
  series: SerieDicom[];
}

/** Una serie tiene cine-loop cuando trae más de un frame. */
export function esCineLoop(serie: Pick<SerieDicom, 'frames'>): boolean {
  return serie.frames.length > 1;
}

/** FPS efectivo de una serie (default 30, acotado a un rango sano). */
export function fpsEfectivo(serie: Pick<SerieDicom, 'fps'>): number {
  const fps = serie.fps ?? 30;
  if (!Number.isFinite(fps) || fps <= 0) return 30;
  return Math.min(Math.max(fps, 1), 120);
}
