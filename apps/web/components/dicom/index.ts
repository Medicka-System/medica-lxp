/**
 * `components/dicom` — Visor DICOM del Campus (Sprint 4.7 / 5).
 *
 * Interfaz pública para embeber el visor en pantallas (bitácora, Ateneo,
 * Biblioteca, editor de caso). El acoplamiento a Cornerstone3D vive tras
 * `MotorVisor`; las pantallas solo usan `<VisorDicom estudio={…} />`.
 */
export { VisorDicom, type VisorDicomProps } from './visor-dicom';
export { BarraHerramientas, ControlesCine } from './toolbar';

// Tipos de entrada (contrato de datos, ya parseado/anonimizado).
export type { EstudioDicom, SerieDicom, FrameDicom } from './types';
export { esCineLoop, fpsEfectivo } from './types';

// Herramientas.
export {
  HERRAMIENTAS,
  HERRAMIENTA_POR_DEFECTO,
  obtenerHerramienta,
  herramientasPorCategoria,
  type Herramienta,
  type HerramientaId,
  type CategoriaHerramienta,
} from './herramientas';

// Motor: solo la interfaz y el error. El motor Cornerstone3D NO se re-exporta
// aquí a propósito — se importa de forma dinámica (`./engine/motor-cornerstone`)
// para no arrastrar WebGL/Web Workers al bundle de servidor ni a los tests.
export { MotorVisorError, type MotorVisor } from './motor';

// Hooks (por si una pantalla necesita orquestación a medida).
export { useVisorDicom, type VisorDicomEstado, type UseVisorDicomOpts } from './use-visor-dicom';
export { useCineLoop, type CineLoop, type UseCineLoopOpts } from './use-cine-loop';
