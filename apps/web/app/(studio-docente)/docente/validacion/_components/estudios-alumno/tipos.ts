/**
 * Studio docente · Validación · Estudios del alumno — tipos de la rejilla.
 *
 * Los tipos de DOMINIO (EstudioAlumno, ResumenAlumno, SugerenciaEco, EstadoEstudio) viven en
 * el contrato del docente (`_lib/contrato.ts`) porque los produce el data layer; aquí se
 * re-exportan para que los componentes portados del mock conserven `import … from "./tipos"`.
 * `FiltroEstudios` / `OrdenEstudios` son estado de UI (solo cliente).
 */

export type {
  EstadoEstudio,
  SugerenciaEco,
  EstudioAlumno,
  ResumenAlumno,
} from '../../../../_lib/contrato';

import type { EstadoEstudio } from '../../../../_lib/contrato';

export type FiltroEstudios = 'todos' | EstadoEstudio;
export type OrdenEstudios = 'pendientes-primero' | 'recientes' | 'antiguos';

/** Umbral a partir del cual un pendiente se marca como urgente (ámbar reforzado). */
export const HORAS_URGENTE = 72;
