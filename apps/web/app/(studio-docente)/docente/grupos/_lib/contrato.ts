import 'server-only';

/**
 * Contrato de la sección Grupos del DOCENTE (seguimiento · §5B). "Seguimiento, no
 * dashboard": nombres y motivos en palabras, no gráficas de vanidad. Un solo color de
 * atención (ÁMBAR) para el riesgo; el VIOLETA queda reservado a Eco (§5A).
 *
 * Todo se calcula del roster REAL de CORA (puente SECDEF `cora_alumnos_de_grupo` · §10)
 * cruzado con el avance/casos/entregas/competencia del alumno bajo RLS. Nada se escribe
 * en `public`. Las señales de riesgo salen de umbrales (ver `REGLAS_RIESGO` en datos.ts),
 * que a futuro migran a la config del súper admin (§7A).
 */

/** Estado global del grupo (deriva del nº de alumnos que requieren intervención). */
export type EstadoGrupo = 'al-dia' | 'con-rezago' | 'requiere-atencion';

/** Por qué un alumno requiere intervención — el motivo, no un puntaje. */
export type SenalRiesgo = 'sin-actividad' | 'reprobando' | 'casos-rechazados';

/** Card del listado: cómo va el grupo y a quién hay que atender. */
export type GrupoSeguimientoCard = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: 'sincrono' | 'asincrono';
  fechaInicio: Date | null;
  moduloEnCurso: string | null;
  alumnos: number;
  /** Avance medio del grupo (% de lecciones completadas). */
  avance: number;
  /** Alumnos con alguna señal de riesgo. */
  enRiesgo: number;
  estado: EstadoGrupo;
  /** Desglose del riesgo en palabras (o la declaración del grupo sano). */
  resumenRiesgo: string;
  /** Casos por revisar en el grupo (cola de validación). */
  casosPorRevisar: number;
  /** Entregas por revisar en el grupo. */
  entregasPorRevisar: number;
};

/** Un alumno en la tabla de seguimiento del detalle. */
export type AlumnoSeguimiento = {
  id: string;
  iniciales: string;
  /** URL de foto YA firmada (null = sin foto → cae a iniciales). La firma el server. */
  avatarUrl: string | null;
  nombre: string;
  matricula: string | null;
  moduloEnCurso: string | null;
  avance: number;
  casosSubidos: number;
  casosValidados: number;
  casosRechazados: number;
  /** "entregadas / total entregables del programa". */
  entregas: string;
  /** Competencia I-AIM media (0..100); null si el worker aún no la proyecta. */
  competencia: number | null;
  ultimaActividad: string;
  sinActividad: boolean;
  /** null = sin señal → va al día. */
  senal: { tipo: SenalRiesgo; motivo: string } | null;
};

/** Una cifra del resumen (tira de KPIs del detalle). */
export type ResumenKpi = { etiqueta: string; valor: string; nota: string; atencion?: boolean };

/** Conteos para las pestañas de filtro de alumnos. */
export type ConteosAlumnos = { todos: number; atencion: number; sinActividad: number; alDia: number };

/** Detalle del grupo: cabecera + KPIs + roster con señales. */
export type GrupoDetalleSeguimiento = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: 'sincrono' | 'asincrono';
  fechaInicio: Date | null;
  moduloEnCurso: string | null;
  resumen: ResumenKpi[];
  alumnos: AlumnoSeguimiento[];
  conteos: ConteosAlumnos;
};
