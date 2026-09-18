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
 * PENDIENTE DE API / DB (fuera de apps/web):
 *   • DICOM: visor Cornerstone3D, series/anotaciones, y la ANONIMIZACIÓN bloqueante
 *     en ingesta (worker `procesar-dicom`) — es el Sprint 4.7. Aquí el visor es un
 *     placeholder y "anclar hallazgo a anotación" queda sin cablear.
 *   • Puente bitácora→banco: el caso del alumno validado por un docente debería entrar
 *     al banco "por curar". Hoy no hay enlace `bitacora_casos`→`casos_biblioteca` ni
 *     campo `origen`/`estado_curaduria` en casos_biblioteca (PENDIENTE DE DB). Por eso
 *     el origen (alumno/staff) y las bandejas "de alumno vs staff" no se distinguen.
 *   • "Marcar para simulador" y "Archivado": no hay flag en el esquema (PENDIENTE DE DB).
 *     Endpoint esperado cuando exista: POST /studio/casos/:id/simulador { activo }.
 *   • "Piezas / loops" del estudio: metadatos del DICOM (PENDIENTE 4.7) → hoy 0.
 */

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

export type CasoEditor = {
  id: string;
  titulo: string;
  organo: string;
  dominioIaim: DominioIaim | null;
  diagnostico: string;
  hallazgosClave: string[];
  puntosAprendizaje: string[];
  erroresComunes: string[];
  publicado: boolean;
  tieneDicom: boolean;
  curador: string | null;
};
