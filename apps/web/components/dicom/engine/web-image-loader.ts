'use client';

/**
 * WEB IMAGE LOADER para Cornerstone3D (§3 · soporte JPG/PNG además de DICOM).
 *
 * Muchos estudios de la biblioteca son imágenes JPG/PNG extraídas del equipo (no `.dcm`
 * crudo). El visor es TRANSVERSAL y debe mostrar ambos formatos en el MISMO viewport. El
 * loader DICOM (`@cornerstonejs/dicom-image-loader`) solo atiende `wadouri:`/`wadors:`;
 * para las imágenes web registramos AQUÍ un loader propio bajo el esquema `web:`.
 *
 * No hay paquete oficial de web loader para Cornerstone3D v5, así que se construye el
 * `IImage` a mano con el MISMO helper que usa el loader DICOM
 * (`utilities.VoxelManager.createImageVoxelManager`) — cero dependencias nuevas (§3/§13).
 *
 * Descarga la URL firmada → `blob` → `createImageBitmap` (evita el "tainted canvas": el
 * blob es same-origin) → canvas 2D → RGBA → RGB para el voxel manager. SIN calibración:
 * `columnPixelSpacing`/`rowPixelSpacing` = 1 y no se registra `imagePlaneModule`, así que
 * el visor NO ofrece medición en mm (las mediciones caen a píxeles · §3).
 */

import { imageLoader, metaData, utilities, Enums, type Types } from '@cornerstonejs/core';

const ESQUEMA = 'web';
let registrado = false;

/** Registra el loader `web:` + su proveedor de metadatos, una sola vez (idempotente). */
export function registrarWebImageLoader(): void {
  if (registrado) return;
  imageLoader.registerImageLoader(ESQUEMA, cargarWebImage as never);
  // El StackViewport arma el actor leyendo los MÓDULOS del REGISTRO de metadatos (no del
  // objeto imagen · buildMetadata/getImageDataMetadata). El loader DICOM los registra; el web
  // debe hacer lo mismo. Sin `imagePlaneModule`, `getImagePlaneModule` hace
  // `undefined.usingDefaultValues` y LANZA → el actor no se crea y la imagen se ve NEGRA.
  metaData.addProvider(proveedorMetadatosWeb, 10_000);
  registrado = true;
}

/** Proveedor de metadatos para imageIds `web:` — RGB 8-bit, sin calibración física. */
function proveedorMetadatosWeb(type: string, imageId: unknown): unknown {
  if (typeof imageId !== 'string' || !imageId.startsWith(`${ESQUEMA}:`)) return undefined;
  if (type === 'imagePlaneModule') {
    // OBLIGATORIO: sin esto, `getImagePlaneModule` de Cornerstone hace
    // `undefined.usingDefaultValues` y LANZA → el actor no se crea y la imagen se ve NEGRA.
    // Espaciado 1 (px): imagen sin calibración física — no hay medición en mm.
    return {
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      columnCosines: [0, 1, 0],
      rowCosines: [1, 0, 0],
      imagePositionPatient: [0, 0, 0],
      imageOrientationPatient: [1, 0, 0, 0, 1, 0],
      usingDefaultValues: true,
    };
  }
  if (type === 'imagePixelModule') {
    return {
      samplesPerPixel: 3,
      photometricInterpretation: 'RGB',
      planarConfiguration: 0,
      bitsAllocated: 8,
      bitsStored: 8,
      highBit: 7,
      pixelRepresentation: 0,
      // Sin ventana clínica: rango completo 8-bit (no hay windowing en una imagen web).
      windowWidth: 256,
      windowCenter: 128,
    };
  }
  if (type === 'generalSeriesModule') {
    // XC = fotografía/captura externa (no US). Coherente con "imagen sin calibración".
    return { modality: 'XC' };
  }
  return undefined;
}

/** Construye el `imageId` de una imagen web a partir de su URL firmada. */
export function imageIdWeb(url: string): string {
  return `${ESQUEMA}:${url}`;
}

interface ObjetoCarga {
  promise: Promise<Types.IImage>;
}

/** Loader registrado: Cornerstone llama con el `imageId` (`web:<url>`). */
function cargarWebImage(imageId: string): ObjetoCarga {
  // El esquema es todo lo anterior al primer `:`; la URL puede traer más `:` (http://…).
  const url = imageId.slice(imageId.indexOf(':') + 1);
  return { promise: decodificar(imageId, url) };
}

async function decodificar(imageId: string, url: string): Promise<Types.IImage> {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`No se pudo descargar la imagen (${resp.status}).`);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No hay contexto 2D para decodificar la imagen.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const rgba = ctx.getImageData(0, 0, width, height).data; // Uint8ClampedArray (w*h*4)
  // Cornerstone3D representa color como RGB (3 componentes); descartamos el alfa.
  const n = width * height;
  const scalarData = new Uint8Array(n * 3);
  for (let i = 0, j = 0; i < n; i++) {
    scalarData[j++] = rgba[i * 4] ?? 0;
    scalarData[j++] = rgba[i * 4 + 1] ?? 0;
    scalarData[j++] = rgba[i * 4 + 2] ?? 0;
  }

  const numberOfComponents = 3;
  const voxelManager = utilities.VoxelManager.createImageVoxelManager({
    width,
    height,
    scalarData,
    numberOfComponents,
  });

  // Mismo molde que el `createImage` del loader DICOM (color path), sin calibración.
  const image = {
    imageId,
    dataType: 'Uint8Array',
    color: true,
    rgba: false,
    numberOfComponents,
    columns: width,
    rows: height,
    width,
    height,
    minPixelValue: 0,
    maxPixelValue: 255,
    slope: 1,
    intercept: 0,
    windowCenter: 128,
    windowWidth: 256,
    voiLUTFunction: Enums.VOILUTFunctionType.LINEAR,
    // SIN calibración física (imagen sin tags): 1 px = 1 unidad. No hay medición en mm.
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    invert: false,
    sizeInBytes: scalarData.byteLength,
    getPixelData: () => scalarData,
    getCanvas: () => canvas,
    voxelManager,
  } as unknown as Types.IImage;

  return image;
}
