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
 * INSCRIPCIÓN REAL AL GRUPO (mig 0036 · §1/§6/§10):
 *   • El alumno se inscribe al GRUPO (instancia del programa), no al programa. El
 *     enlace CORA↔LXP es `lxp.grupos.cora_grupo_id` (vínculo por valor a public.grupos),
 *     leído vía `lxp.cora_grupos_de` (SECURITY DEFINER, solo lectura). Mis cursos y el
 *     flag `inscrito` derivan de `programasDelAlumno` (sus grupos → sus programas).
 *     Fallback de resiliencia: sin inscripción mapeada, Mis cursos muestra el catálogo
 *     publicado para poder arrancar. En el Sprint 11 solo cambia la FUENTE (CORA real),
 *     no la lógica; en local la simula el seed.
 *
 * PENDIENTE DE API / DB (fuera de apps/web — NO se implementa aquí):
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
  /** Cohorte del alumno en este programa (su grupo · inscripción CORA). null si no mapeado. */
  grupo: { id: string; nombre: string } | null;
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
