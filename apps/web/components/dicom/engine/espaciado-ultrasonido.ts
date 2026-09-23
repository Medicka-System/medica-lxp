'use client';

/**
 * Espaciado de píxeles para ULTRASONIDO (aspect ratio real · § contexto clínico).
 *
 * Los píxeles de un estudio de USG **no son cuadrados**. Si se asume 1:1 cuando en
 * realidad son rectangulares, una estructura redonda se ve elíptica → error clínico.
 *
 * Cornerstone3D calcula el aspect a partir de `rowPixelSpacing` / `columnPixelSpacing`
 * del `imagePlaneModule`, pero el loader DICOM SOLO deriva el espaciado de PixelSpacing
 * (0028,0030) — que la mayoría de las imágenes de USG NO traen — y parsea el `.dcm` en un
 * **web worker**, así que un proveedor de main-thread no puede leer sus tags (Pixel Aspect
 * Ratio, regiones US). Por eso el espaciado correcto se calcula UNA vez en la INGESTA
 * (worker `procesar-dicom`, con el dataSet completo) y viaja por el contrato hasta aquí:
 * el visor lo REGISTRA por `imageId` en este mapa (main-thread) y este proveedor de
 * `imagePlaneModule` (alta prioridad) lo devuelve. `createImage` aplica ese espaciado al
 * `image` y Cornerstone renderiza con el aspect correcto. No reinventa el visor: solo
 * aporta el metadato de espaciado que Cornerstone no calcula para USG.
 */

/** Espaciado físico de una imagen: mm por píxel entre filas (row) y columnas (col). */
export interface Espaciado {
  row: number;
  col: number;
}

/** Registro `imageId → espaciado` (main-thread). Clave sin el sufijo `&frame=`. */
const espaciadoPorImagen = new Map<string, Espaciado>();

/** Normaliza el imageId a su URL base (los frames de un multi-frame comparten espaciado). */
function claveImagen(imageId: string): string {
  const i = imageId.indexOf('&frame=');
  return i === -1 ? imageId : imageId.slice(0, i);
}

function finitoPos(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * Registra el espaciado de una imagen (lo llama el visor al armar el estudio, con el
 * espaciado que calculó la ingesta). Ignora valores no positivos o cuadrados (1:1: nada
 * que corregir → deja que resuelva el loader).
 */
export function registrarEspaciadoImagen(imageId: string, row: number, col: number): void {
  if (!finitoPos(row) || !finitoPos(col)) return;
  if (row === col) return;
  espaciadoPorImagen.set(claveImagen(imageId), { row, col });
}

/** Solo para tests: limpia el registro. */
export function _limpiarEspaciado(): void {
  espaciadoPorImagen.clear();
}

/** `imagePlaneModule` con el espaciado registrado para `imageId`, o `null` si no hay. */
export function imagePlaneModuleDe(imageId: string): Record<string, unknown> | null {
  const esp = espaciadoPorImagen.get(claveImagen(imageId));
  if (!esp) return null;
  return {
    rowPixelSpacing: esp.row,
    columnPixelSpacing: esp.col,
    pixelSpacing: [esp.row, esp.col],
    usingDefaultValues: false,
  };
}

/** Forma mínima de `metaData` de Cornerstone que usa el registro del proveedor. */
interface MetaDataApi {
  addProvider: (
    provider: (type: string, ...query: string[]) => unknown,
    priority?: number,
  ) => void;
}

let registrado = false;

/**
 * Registra (una sola vez) el proveedor de `imagePlaneModule` de alta prioridad que lee el
 * espaciado del mapa. Devuelve `undefined` si la imagen no tiene espaciado registrado →
 * Cornerstone usa el proveedor por defecto del loader (PixelSpacing o 1:1).
 */
export function registrarEspaciadoUltrasonido(md: MetaDataApi): void {
  if (registrado) return;
  registrado = true;
  md.addProvider((type: string, imageId: string): unknown => {
    if (type !== 'imagePlaneModule') return undefined;
    if (typeof imageId !== 'string' || !imageId.startsWith('wadouri:')) return undefined;
    return imagePlaneModuleDe(imageId) ?? undefined;
  }, 10_000);
}
