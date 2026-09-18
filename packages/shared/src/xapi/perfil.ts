/**
 * Perfil xAPI del Campus Virtual LXP (§7). Define los VERBOS y TIPOS DE ACTIVIDAD
 * del proyecto — el vocabulario común que emiten contenido, casos, clases y
 * evaluación al LRS. Se comparte front/back; es data pura (sin infra).
 */

/** IRI base del vocabulario propio del proyecto (verbos/actividades no estándar). */
export const XAPI_BASE_IRI = 'https://xapi.medicacapacitacion.com';

/** Versión de la spec xAPI que hablamos con el LRS. */
export const XAPI_VERSION = '1.0.3';

/**
 * Verbos del perfil (§7). Se reutilizan los IRI estándar de ADL donde existen;
 * los específicos del dominio (`subió`, `validó`) usan el IRI del proyecto.
 * `display` es multilingüe (es-MX principal, en-US por interoperabilidad).
 */
export const VERBOS = {
  experimento: {
    id: 'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'es-MX': 'experimentó', 'en-US': 'experienced' },
  },
  completo: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'es-MX': 'completó', 'en-US': 'completed' },
  },
  aprobo: {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'es-MX': 'aprobó', 'en-US': 'passed' },
  },
  subio: {
    id: `${XAPI_BASE_IRI}/verbs/subio`,
    display: { 'es-MX': 'subió', 'en-US': 'uploaded' },
  },
  valido: {
    id: `${XAPI_BASE_IRI}/verbs/valido`,
    display: { 'es-MX': 'validó', 'en-US': 'validated' },
  },
  asistio: {
    id: 'http://adlnet.gov/expapi/verbs/attended',
    display: { 'es-MX': 'asistió', 'en-US': 'attended' },
  },
  fallo: {
    id: 'http://adlnet.gov/expapi/verbs/failed',
    display: { 'es-MX': 'falló', 'en-US': 'failed' },
  },
} as const;

export type VerboClave = keyof typeof VERBOS;

/**
 * Tipos de actividad (objeto de los statements · §7): lección, caso, clase y
 * dominio I-AIM. IRI del proyecto (no hay estándar ADL para estos dominios).
 */
export const TIPOS_ACTIVIDAD = {
  leccion: `${XAPI_BASE_IRI}/activitytypes/leccion`,
  caso: `${XAPI_BASE_IRI}/activitytypes/caso`,
  clase: `${XAPI_BASE_IRI}/activitytypes/clase`,
  dominio_iaim: `${XAPI_BASE_IRI}/activitytypes/dominio-iaim`,
} as const;

export type TipoActividadClave = keyof typeof TIPOS_ACTIVIDAD;
