'use client';

/**
 * Rasteriza las imágenes DICOM del reporte EN EL CLIENTE para el PDF (§6.5 · Opción 1).
 *
 * Las imágenes DICOM no tienen raster server-side (solo el `.dcm`); la imagen visible la
 * "revela" el visor Cornerstone en el navegador. Para el PDF, este util recorre los campos
 * `imagen/dicom` con estudio insertado, resuelve sus series (mismo `lecturaEstudioDicom` que
 * `VisorEstudio`), rasteriza el 1.er frame de la 1.ª serie de cada uno en un viewport oculto
 * (`renderImagenesPng`) y devuelve los PNG por `campoId` para mandarlos al `api`.
 */

import { lecturaEstudioDicom } from '@/lib/dicom/acciones';
import { imageIdWeb } from '@/components/dicom/engine/web-image-loader';
import { registrarEspaciadoImagen } from '@/components/dicom/engine/espaciado-ultrasonido';
import { renderImagenesPng } from '@/components/dicom/engine/motor-cornerstone';
import { leerGaleria, leerRefDicom, type EstructuraPlantilla } from '@/lib/reportes/estructura';
import { firmarLecturaImagenes } from '@/lib/reportes/imagenes-acciones';

export type ImagenDicomRasterizada = { campoId: string; pngBase64: string };
export type ImagenGaleriaRasterizada = { ref: string; pngBase64: string };

export async function rasterizarDicomDelReporte(
  estructura: EstructuraPlantilla,
  valores: Record<string, unknown>,
): Promise<ImagenDicomRasterizada[]> {
  // 1) Campos imagen/dicom con un estudio insertado.
  const pendientes: { campoId: string; casoId: string; tabla: 'bitacora_casos' | 'casos_biblioteca' }[] = [];
  for (const s of estructura.secciones) {
    if (s.tipo === 'encabezado') continue;
    for (const c of s.campos) {
      if (c.tipo !== 'imagen' || c.origen !== 'dicom') continue;
      const ref = leerRefDicom(valores[c.id]);
      if (ref) pendientes.push({ campoId: c.id, casoId: ref.casoId, tabla: ref.tabla });
    }
  }
  if (pendientes.length === 0) return [];

  // 2) Resolver series por caso (cache) y construir el imageId de la 1.ª serie, tal como
  //    lo hace `VisorEstudio` (web loader para JPG/PNG, wadouri para .dcm, espaciado USG).
  const cache = new Map<string, Awaited<ReturnType<typeof lecturaEstudioDicom>>>();
  const entradas: { campoId: string; imageId: string }[] = [];
  for (const p of pendientes) {
    const clave = `${p.tabla}:${p.casoId}`;
    let r = cache.get(clave);
    if (!r) {
      r = await lecturaEstudioDicom(p.casoId, p.tabla);
      cache.set(clave, r);
    }
    if (!r.ok || r.datos.series.length === 0) continue;
    const s0 = r.datos.series[0]!;
    let imageId: string;
    if (s0.tipo === 'imagen') {
      imageId = imageIdWeb(s0.urlLectura);
    } else {
      const base = `wadouri:${s0.urlLectura}`;
      const esp = s0.pixelSpacing;
      if (esp && esp.length === 2) registrarEspaciadoImagen(base, esp[0], esp[1]);
      imageId = (s0.frames ?? 1) > 1 ? `${base}&frame=1` : base;
    }
    entradas.push({ campoId: p.campoId, imageId });
  }
  if (entradas.length === 0) return [];

  // 3) Rasterizar todo de una pasada y mapear por campoId.
  const pngs = await renderImagenesPng(entradas.map((e) => e.imageId));
  const salida: ImagenDicomRasterizada[] = [];
  entradas.forEach((e, i) => {
    const url = pngs[i];
    if (url) salida.push({ campoId: e.campoId, pngBase64: url.replace(/^data:image\/\w+;base64,/, '') });
  });
  return salida;
}

/**
 * Rasteriza las imágenes `.dcm` de las GALERÍAS del reporte para el PDF (mismo principio que
 * arriba · § Opción 1). Un `.dcm` de galería vive en object storage (no en un caso), así que
 * se firma su lectura (`firmarLecturaImagenes`), se arma el `imageId` wadouri y se rasteriza a
 * PNG. Las imágenes JPG/PNG de galería NO pasan por aquí: el `api` las embebe server-side.
 */
export async function rasterizarGaleriaDicomDelReporte(
  reporteId: string,
  estructura: EstructuraPlantilla,
  valores: Record<string, unknown>,
): Promise<ImagenGaleriaRasterizada[]> {
  // 1) refs .dcm de todos los campos galeria con imágenes.
  const refs: string[] = [];
  for (const s of estructura.secciones) {
    if (s.tipo === 'encabezado') continue;
    for (const c of s.campos) {
      if (c.tipo !== 'galeria') continue;
      for (const img of leerGaleria(valores[c.id])) {
        if (img.ext === 'dcm' && img.ref) refs.push(img.ref);
      }
    }
  }
  if (refs.length === 0) return [];

  // 2) Firmar la lectura (candado de propiedad en el server action) y armar imageIds wadouri.
  const firma = await firmarLecturaImagenes(reporteId, refs);
  if (!firma.ok) return [];
  const pares = refs
    .map((ref) => ({ ref, url: firma.datos.urls[ref] }))
    .filter((p): p is { ref: string; url: string } => typeof p.url === 'string' && p.url.length > 0);
  if (pares.length === 0) return [];

  // 3) Rasterizar y mapear por ref.
  const pngs = await renderImagenesPng(pares.map((p) => `wadouri:${p.url}`));
  const salida: ImagenGaleriaRasterizada[] = [];
  pares.forEach((p, i) => {
    const url = pngs[i];
    if (url) salida.push({ ref: p.ref, pngBase64: url.replace(/^data:image\/\w+;base64,/, '') });
  });
  return salida;
}
