'use client';

/**
 * Utilidades CLIENTE para generar/descargar el PDF de un reporte (§6.5) — compartidas por el
 * editor y el LISTADO ("Mis reportes"), sin duplicar el motor: rasteriza las imágenes DICOM
 * offscreen reusando `_rasterizar-dicom` (pool de Cornerstone) y pide el PDF al endpoint del
 * `api` vía el server action `generarPdf`. Cornerstone se importa DINÁMICO (solo al generar),
 * así el bundle del listado no lo arrastra hasta que se usa.
 */

import { generarPdf, type ImagenDicomReporte, type ImagenGaleriaDicomReporte, type ResultadoPdf } from './_acciones';
import type { EstructuraPlantilla } from '@/lib/reportes/estructura';

/** Corre `p` con límite de tiempo; si no resuelve en `ms`, devuelve `fallback` (no cuelga). */
function conLimite<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/**
 * Rasteriza las imágenes DICOM del reporte (campos imagen/dicom Y .dcm de galería) y pide el PDF.
 * Timeouts + guardia global: si el raster no termina a tiempo, el PDF sale igual con el resto del
 * contenido. Reusa la util de rasterizado y el endpoint (no reimplementa el motor).
 */
export async function construirPdfReporte(
  reporteId: string,
  estructura: EstructuraPlantilla,
  valores: Record<string, unknown>,
): Promise<ResultadoPdf> {
  const { rasterizarDicomDelReporte, rasterizarGaleriaDicomDelReporte } = await import('./_rasterizar-dicom');
  let imagenesDicom: ImagenDicomReporte[] = [];
  let imagenesGaleriaDicom: ImagenGaleriaDicomReporte[] = [];
  try {
    imagenesDicom = await conLimite(rasterizarDicomDelReporte(estructura, valores), 60_000, []);
  } catch {
    /* si el visor no pudo rasterizar, el PDF sale con el resto del contenido */
  }
  try {
    imagenesGaleriaDicom = await conLimite(
      rasterizarGaleriaDicomDelReporte(reporteId, estructura, valores),
      90_000,
      [],
    );
  } catch {
    /* idem para las imágenes .dcm de galería */
  }
  return generarPdf(reporteId, imagenesDicom, imagenesGaleriaDicom);
}

/** Decodifica el PDF (base64 del server action) a un Blob descargable/imprimible. */
export function base64ABlob(b64: string, tipo: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Descarga el PDF (base64) como archivo. */
export function descargarPdfBlob(pdfBase64: string, filename: string): void {
  const url = URL.createObjectURL(base64ABlob(pdfBase64, 'application/pdf'));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
