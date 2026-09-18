/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Mi Bitácora — expediente de práctica del alumno (§6, CORAZÓN del producto).
 * Qué es REAL aquí (web→Supabase bajo RLS) y qué es PENDIENTE (dominio / DICOM).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (lxp.bitacora_casos, policies bitacora_* de 0010 · alumno solo lo suyo + si
 * acceso_activo):
 *   • Listado de los casos del alumno con su estado de validación.
 *   • "Subir caso": inserta un caso `pendiente` heredando el MÓDULO (y sus horas)
 *     del contexto; el alumno aporta órgano, dominio I-AIM, hallazgos y diagnóstico.
 *   • Agregados de avance (casos por estado, por dominio, por módulo). Las HORAS
 *     acreditadas se leen de la proyección de competencia (competencia_dominios),
 *     que es la fuente de verdad de horas (la escribe el worker · §6).
 *
 * PENDIENTE DE API / DB (fuera de apps/web — NO se implementa aquí):
 *   • Pipeline DICOM (Sprint 4.7 · worker `procesar-dicom`): subir el estudio a
 *     object storage, ANONIMIZAR (bloqueante · §10) y fijar `estudio_dicom_ref` +
 *     `estudio_series`. Aquí el visor es placeholder y la "subida" crea el caso SIN
 *     binario (estudio_estado 'pendiente'); el CHECK de 0014 impide ref sin traza.
 *   • Validación del docente (Sprint 5.5 · escribe lxp.validaciones): aprobar/rechazar
 *     con feedback. Al APROBAR, dominio dispara el worker `calculo-competencia` y
 *     emite el statement xAPI `validó`/`aprobó` a la cola `envio-xapi` (§7/§8).
 *       Contrato esperado: POST /studio/validaciones { casoId, decision, feedback,
 *       correccionSobreEco? } → 200 { validacionId }.
 *   • Horas por caso: no hay "horas por caso" en el módulo (solo horas totales del
 *     módulo). Las horas que acredita un caso las decide el docente/dominio al
 *     validar; hasta entonces `horas_estimadas` queda en 0 (no se inventa un valor).
 *   • Mapa grupo(CORA)→programa/grupo(LXP): no existe enlace en el seed, así que los
 *     módulos del "Subir caso" salen de los programas publicados y el caso se guarda
 *     con `grupo_id` nulo. Se cablea en la integración CORA (Sprint 11).
 *   • xAPI `subió` al crear el caso: emisión vía cola `envio-xapi` (dominio · §7).
 *       Contrato esperado: el server action, tras insertar, encola
 *       { actor: userId, verbo: 'subió', objeto: { tipo: 'caso', id } }.
 */

export type DominioIaim = 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';

export const DOMINIO_LABEL: Record<DominioIaim, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión',
};

export const DOMINIOS: DominioIaim[] = [
  'indicacion',
  'adquisicion',
  'interpretacion',
  'decision_medica',
];

export type EstadoCaso = 'pendiente' | 'aprobado' | 'rechazado';

/** Estado del estudio en el pipeline DICOM (0014). null en casos sin binario. */
export type EstudioEstado =
  | 'pendiente'
  | 'recibido'
  | 'procesando'
  | 'anonimizado'
  | 'error'
  | null;

/** Módulo elegible para colgar un caso (de programas publicados). */
export type ModuloOpcion = {
  id: string;
  nombre: string;
  programa: string;
  horas: number;
};

export type CasoBitacora = {
  id: string;
  hallazgoCorto: string;
  modulo: string | null;
  organo: string | null;
  dominio: DominioIaim | null;
  fecha: Date;
  estado: EstadoCaso;
  estudioEstado: EstudioEstado;
  piezas: number;
  cineLoop: boolean;
  horas: number;
  /** Feedback del docente si fue rechazado/aprobado (lxp.validaciones). */
  feedback: string | null;
};

export type BitacoraData = {
  horas: { acreditadas: number; meta: number };
  casos: { total: number; aprobados: number; pendientes: number; rechazados: number };
  porDominio: { dominio: DominioIaim; casos: number; pct: number; enRepaso: boolean }[];
  porModulo: { modulo: string; casos: number }[];
  modulos: ModuloOpcion[];
  items: CasoBitacora[];
};

export const ETIQUETA_ESTADO: Record<EstadoCaso, string> = {
  pendiente: 'En revisión',
  aprobado: 'Acreditado',
  rechazado: 'Requiere cambios',
};
