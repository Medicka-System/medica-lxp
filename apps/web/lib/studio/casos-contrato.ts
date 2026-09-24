/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Casos — curaduría del banco (§5B/§7A). Qué es REAL aquí y qué es PENDIENTE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (web→Supabase bajo RLS · lxp.casos_biblioteca, escribe lxp.es_staff()):
 *   • catalogación (título, órgano, dominio I-AIM),
 *   • diagnóstico correcto,
 *   • VERDAD ESTRUCTURADA (hallazgos_clave, puntos_aprendizaje, errores_comunes —
 *     lo que habilita a Eco y a los simuladores · §7A),
 *   • publicar a Biblioteca (publicado bool).
 *   Bandejas derivadas de `publicado`: "Por curar" (false) vs "En Biblioteca" (true).
 *
 * REAL (puente bitácora→banco · apps/api · §5B): al aprobar un caso de la bitácora, el
 *   dominio (ValidacionService) lo promueve a `casos_biblioteca` "por curar" con
 *   `origen_caso_id` (0024), copiando ficha + `contenido_estructurado` + el estudio ya
 *   anonimizado (series + traza §10). El visor DICOM (Cornerstone3D) es transversal y ya
 *   muestra ese estudio en la curaduría.
 *
 * PENDIENTE DE API / DB (fuera de apps/web):
 *   • "Anclar hallazgo a anotación": requiere anotaciones sobre el visor (sin cablear).
 *   • "Marcar para simulador" y "Archivado": no hay flag en el esquema (PENDIENTE DE DB).
 *     Endpoint esperado cuando exista: POST /studio/casos/:id/simulador { activo }.
 */

import type { ContenidoEstructuradoCaso } from '@campus/shared';

export type DominioIaim = 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';

export const DOMINIO_LABEL: Record<DominioIaim, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión',
};

/** Estado de curaduría REAL derivado de `publicado` (los demás estados son PENDIENTE). */
export type EstadoCaso = 'por_curar' | 'biblioteca';

export type CasoResumen = {
  id: string;
  titulo: string;
  organo: string | null;
  dominio: DominioIaim | null;
  estado: EstadoCaso;
  curador: string | null;
  verdadCompleta: boolean;
  cuando: Date;
};

/** Estado del estudio DICOM del caso curado (espejo del enum, null si no hay). */
export type EstudioEstadoCaso =
  | 'pendiente'
  | 'recibido'
  | 'procesando'
  | 'anonimizado'
  | 'error'
  | null;

export type CasoEditor = {
  id: string;
  titulo: string;
  organo: string;
  patologia: string;
  dominioIaim: DominioIaim | null;
  tecnica: string;
  equipo: string;
  vineta: string;
  etiquetas: string[];
  diagnostico: string;
  hallazgosClave: string[];
  puntosAprendizaje: string[];
  erroresComunes: string[];
  publicado: boolean;
  tieneDicom: boolean;
  /** Estado del pipeline del estudio (para mostrar visor/uploader/estado). */
  estudioEstado: EstudioEstadoCaso;
  /** Nº de series anonimizadas del estudio. */
  series: number;
  curador: string | null;
  /** Verdad ESTRUCTURADA heredada del reporte/caso de origen (§7A). null = sin estructura.
   *  El curador la ajusta (tablas/mediciones) antes de publicar. Coincide con el reporte. */
  contenidoEstructurado: ContenidoEstructuradoCaso | null;
};
