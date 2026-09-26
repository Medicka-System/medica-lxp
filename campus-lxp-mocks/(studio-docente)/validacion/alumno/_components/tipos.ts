/**
 * Studio docente · Validación · Estudios del alumno — tipos compartidos.
 * Todos los datos llegan por props desde la BD. Nada hardcodeado en los componentes.
 */

export type EstadoEstudio = "pendiente" | "aprobado" | "devuelto";

/** Pre-análisis de Eco: solo existe en estudios pendientes. Eco propone, el docente firma. */
export type SugerenciaEco = {
  veredicto: "confirmar" | "criterio";
  confianza: number; // 0–100
};

export type EstudioAlumno = {
  id: string;
  titulo: string; // diagnóstico presuntivo del alumno
  modulo: string; // "M04 · L3"
  organo: string; // "riñón derecho"
  fechaEnvio: string; // ISO
  /** 1 = imagen(es) fija(s); > 1 = cine loop */
  frames: number;
  imagenes: number;
  /** URL de la miniatura: primer frame real del estudio, sin overlays */
  miniatura: string;
  /** proporción nativa del estudio para no deformar la miniatura */
  ancho: number;
  alto: number;
  estado: EstadoEstudio;
  horas: number; // acreditables (pendiente/devuelto) o acreditadas (aprobado)
  horasEsperando?: number; // solo pendientes
  eco?: SugerenciaEco;
  /** aprobado: comentario del docente al validar · devuelto: feedback con lo que debe corregir */
  nota?: string;
};

export type ResumenAlumno = {
  id: string;
  ini: string;
  nombre: string;
  especialidad: string;
  grupo: string;
  leccionActual: string;
  horasAcumuladas: number;
  competenciaInterpretacion: number;
};

export type FiltroEstudios = "todos" | EstadoEstudio;
export type OrdenEstudios = "pendientes-primero" | "recientes" | "antiguos";

/** Umbral a partir del cual un pendiente se marca como urgente (ámbar reforzado). */
export const HORAS_URGENTE = 72;
