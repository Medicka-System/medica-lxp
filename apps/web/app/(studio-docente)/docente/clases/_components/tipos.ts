/**
 * Studio docente · Clases — tipos de vista (§5B/§9 · Sprint 6 recableado).
 *
 * Derivan del mock aprobado, pero enriquecidos para venir de la BD real:
 *  · `tipo` mapea `lxp.clase_plataforma` (zoom | mico_plus → "zoom" | "mico").
 *  · las clases traen `inicioISO` para que el contador de HOY se recalcule en cliente.
 *  · las grabaciones traen `estado`/`leccionId` para reflejar el pipeline de ingesta
 *    y ofrecer "Ligar a la lección" cuando aún no cayeron en la videoteca del grupo.
 *
 * El listado va web→Supabase con RLS (Regla de Oro §2); las mutaciones que hablan con
 * Zoom pasan por `apps/api` (dominio · Sprint 6). Eco es PLACEHOLDER aquí (§7A: se
 * conecta al final en todas las secciones); su forma se conserva para el rail.
 */

export type TipoSesion = 'zoom' | 'mico';

export type ClaseProgramada = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  alumnos: number;
  /** Etiqueta legible del día: "hoy" | "jue 18 sep". */
  dia: string;
  /** Hora local en 24h, mono: "19:00". */
  hora: string;
  /** Duración legible: "90 min". */
  duracion: string;
  /** Inicio programado en ISO (para el contador y habilitar "Iniciar"). null si sin fecha. */
  inicioISO: string | null;
  /** Lección ligada (clave "M04 · L3" o nombre). La grabación caerá ahí. */
  leccion?: string;
  hoy?: boolean;
  /** Texto inicial del contador ("2 h 40 min"); el cliente lo recalcula cada minuto. */
  empiezaEn?: string;
  /** MiCo+: deep-link/URL de la sesión (se abre externamente). */
  enlace?: string | null;
  /** Zoom: hay enlace de inicio del host → "Iniciar clase" habilitado. */
  puedeIniciar?: boolean;
};

export type Grabacion = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  /** Fecha legible: "11 sep". */
  fecha: string;
  /** Duración legible "1:24:10" | "58:32". */
  duracion: string;
  /** Asistencia (reporte de participantes de Zoom · null si aún no disponible). */
  asistieron: number | null;
  total: number | null;
  /** Quedó ligada a una lección (cae en la videoteca del grupo/lección). */
  ligada: boolean;
  /** Estado del pipeline de ingesta (relevante para grabaciones de Zoom). */
  estado?: 'procesando' | 'listo' | 'error';
  /** Lección a la que está (o quedaría) ligada. */
  leccionId?: string | null;
  poster?: string;
};

/** Respuesta de Eco (PLACEHOLDER · se conecta al final · §7A). */
export type RespuestaEco = {
  pregunta: string;
  intro: string;
  temas: { fecha: string; tema: string; asistencia: string }[];
  remate: string;
  acciones: { etiqueta: string; primaria?: boolean }[];
};

export type ClasesData = {
  clases: ClaseProgramada[];
  grabaciones: Grabacion[];
  gruposFiltro: string[];
  resumenMes: { titulo: string; valor: string; detalle: string }[];
  /** PLACEHOLDER (sin endpoint) — el espacio donde vivirá Eco. */
  eco: { respuesta: RespuestaEco; sugerencias: string[] };
  totalGrabaciones: number;
  /** Mes actual en curso (título del rail "Su septiembre"). */
  mesActual: string;
};
