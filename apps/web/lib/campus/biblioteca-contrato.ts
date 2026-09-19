/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Biblioteca de casos — acervo curado (§ Sprint 8, §6). Verdad estructurada del caso
 * (§7A), curada por el docente. Qué es REAL aquí y qué es PENDIENTE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (web→Supabase bajo RLS · comoAlumno):
 *   • Lista de casos PUBLICADOS con su verdad estructurada (hallazgos clave, diagnóstico,
 *     puntos de aprendizaje, errores comunes) — policy casos_biblioteca_select
 *     (0010: publicado or staff). El alumno solo ve los publicados.
 *
 * PENDIENTE DE API / infraestructura:
 *   • Visor DICOM real sobre el estudio ANONIMIZADO en object storage (4.7): aquí se usa
 *     el placeholder compartido (VisorDicomPlaceholder), igual que bitácora/ateneo. Se
 *     reemplaza cuando el visor real reciba `dicom_ref` sin tocar esta pantalla.
 */

import type { DominioIaim } from './bitacora-contrato';

/** Un caso del acervo curado, con su verdad estructurada (§7A). */
export type CasoAcervo = {
  id: string;
  titulo: string;
  organo: string | null;
  dominio: DominioIaim | null;
  /** Hallazgos clave (arreglo de la verdad estructurada). */
  hallazgosClave: string[];
  diagnostico: string | null;
  puntosAprendizaje: string[];
  erroresComunes: string[];
  /** Nombre del docente que curó el caso (lxp.perfiles). */
  curador: string | null;
  fecha: Date;
  /** Tiene estudio DICOM asociado (dicom_ref no nulo). */
  tieneDicom: boolean;
};

export type BibliotecaData = {
  casos: CasoAcervo[];
  /** Órganos presentes (para el filtro), ordenados. */
  organos: string[];
};
