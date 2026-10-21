import sharp from 'sharp';
import { CALIDAD_DERIVADO_IMAGEN } from '@campus/shared';

/**
 * Genera UN derivado webp responsivo de una imagen ráster (§ Fase 2 / §6.5). Fuente única del
 * contrato de redimensionado (webp q75, respeta EXIF, SIN agrandar) para que lo compartan el job
 * `generar-derivados-imagen` (Ateneo) y `procesar-imagen-reporte` (galería de reporte) — un solo
 * lugar, cero reimplementación. `withoutEnlargement`: no agranda si el original es menor al ancho.
 */
export async function generarDerivadoWebp(original: Buffer, ancho: number): Promise<Buffer> {
  return sharp(original)
    .rotate() // respeta la orientación EXIF antes de redimensionar
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: CALIDAD_DERIVADO_IMAGEN })
    .toBuffer();
}
