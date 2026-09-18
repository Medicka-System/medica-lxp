/**
 * Contratos de las clases en vivo y sus grabaciones (Sprint 6).
 *
 * Estos tipos describen lo que `apps/api` + `apps/worker` deben proveer. Hoy son
 * PENDIENTE DE API: la página de Clases usa los grupos reales del docente como base
 * de la agenda y deja los CTA de lanzamiento e ingesta claramente marcados.
 *
 * ── Zoom (§9) ────────────────────────────────────────────────────────────────
 *  · Crear/agendar    POST /clases            (body: CrearClaseInput) → ClaseAgendada
 *  · Iniciar clase    POST /clases/:id/iniciar → { startUrl }  (abre Zoom; no SDK)
 *  · Grabación        webhook Zoom `recording.completed` (firma validada)
 *                     → worker `ingesta-grabacion-zoom`: descarga → object storage/Stream
 *                     → registra `Grabacion` ligada a grupo/lección → emite xAPI.
 *
 * ── MiCo+ (Mindray) ──────────────────────────────────────────────────────────
 *  Plataforma cerrada, sin API pública confirmada. Por ahora se **agenda/enlaza**
 *  (patrón "lanzar"); la ejecución y grabación corren fuera. Integración real
 *  pendiente de acuerdo con Mindray.
 */

export type TipoSesion = 'zoom' | 'mico';

/** Alta/agenda de una clase en vivo (PENDIENTE DE API). */
export type CrearClaseInput = {
  grupoId: string;
  tipo: TipoSesion;
  tema: string;
  inicio: string; // ISO datetime
  duracionMin: number;
  /** Lección a la que quedará ligada la grabación. */
  leccionId?: string;
};

/** Clase agendada devuelta por la API (PENDIENTE). */
export type ClaseAgendada = {
  id: string;
  grupoId: string;
  tipo: TipoSesion;
  tema: string;
  inicio: string;
  duracionMin: number;
  leccionId: string | null;
  /** Zoom: enlace para el docente («Iniciar clase»). */
  startUrl?: string;
  /** Zoom: enlace de ingreso para alumnos. */
  joinUrl?: string;
};

/**
 * Grabación ya ingestada (PENDIENTE DE tabla `lxp.grabaciones` + worker). Se lista
 * en «Clases pasadas y grabaciones» y también en la Videoteca del alumno.
 */
export type Grabacion = {
  id: string;
  grupoId: string;
  leccionId: string | null;
  tipo: TipoSesion;
  tema: string;
  fecha: string;
  duracion: string;
  /** Referencia en object storage; URL firmada la emite el servicio de media. */
  ref: string;
  asistieron: number | null;
  total: number | null;
  ligada: boolean;
};
