/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Mis cursos + Explorar/Catálogo (§ Sprint 8 · alumno). Qué es REAL aquí
 * (web→Supabase bajo RLS) y qué es PENDIENTE (integración CORA / dominio).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (lecturas bajo RLS · comoAlumno):
 *   • Catálogo: programas PUBLICADOS con sus módulos (horas acumulables) y conteos
 *     de lecciones/contenidos — policies programas_read/modulos_read (0010, using true).
 *   • Avance del alumno: lecciones/contenidos "completados" desde
 *     lxp.reproduccion_progreso (0017, alumno solo lo suyo).
 *   • "Continuar donde lo dejaste": primera lección del programa (por orden de
 *     módulo/lección) — deep-link a /leccion/[id].
 *
 * PENDIENTE DE API / DB (fuera de apps/web — NO se implementa aquí):
 *   • Inscripción REAL alumno→programa: no existe enlace entre el grupo de CORA
 *     (public.grupos, se lee) y el grupo del LXP (lxp.grupos → programa). Hasta el
 *     Sprint 11 se usa una HEURÍSTICA de actividad (el alumno "tiene" un programa si
 *     registró casos en su bitácora o progreso de reproducción en él); si no hay
 *     señal, Mis cursos muestra el catálogo publicado para poder arrancar. El mapa
 *     definitivo lo cablea la integración CORA (mismo PENDIENTE que bitacora-contrato).
 *   • Upsell / checkout modular: la compra de un programa o módulo suelto vive en el
 *     portal de CORA (§1, "Pagos y facturación"). Explorar deja el CTA que hará el
 *     deep-link al checkout; aquí no se cobra ni se inscribe.
 *   • Horas ACREDITADAS del alumno (no las del temario): son de la proyección de
 *     competencia (competencia_dominios, la escribe el worker · §6) — viven en Mi
 *     dominio / Bitácora, no en el catálogo del curso.
 */

/** Resumen de avance de un curso en el que el alumno participa (Mis cursos). */
export type CursoResumen = {
  programaId: string;
  nombre: string;
  descripcion: string | null;
  modulos: number;
  lecciones: number;
  contenidos: number;
  /** Horas acumulables del temario (suma de módulos · §5B). */
  horas: number;
  /** Contenidos completados por el alumno (reproduccion_progreso). */
  completados: number;
  /** 0..100 — avance = completados / contenidos. */
  avancePct: number;
  /** Lección para "Continuar" (primera del programa, o la siguiente sin completar). */
  continuar: { leccionId: string; nombre: string } | null;
};

/** Módulo dentro de una ficha de catálogo (upsell modular · Explorar). */
export type ModuloCatalogo = {
  id: string;
  nombre: string;
  orden: number;
  horas: number;
  lecciones: number;
};

/** Ficha de programa en el catálogo (Explorar). */
export type ProgramaCatalogo = {
  programaId: string;
  nombre: string;
  descripcion: string | null;
  horas: number;
  lecciones: number;
  modulosLista: ModuloCatalogo[];
  /** El alumno ya participa en este programa (heurística · ver PENDIENTE arriba). */
  inscrito: boolean;
};
