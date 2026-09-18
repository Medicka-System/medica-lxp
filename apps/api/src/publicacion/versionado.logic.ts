/**
 * Máquina de estados PURA de la publicación de programas (§5B/§6 · Sprint 4.5).
 * Sin I/O: define qué transiciones son válidas y qué efectos tienen (snapshot,
 * nueva versión, visibilidad). El servicio la usa para decidir; la BD la obedece.
 *
 *   borrador ──enviar_a_revision──▶ revision ──publicar──▶ publicado
 *      ▲  ▲                            │                      │  │
 *      │  └──────── devolver ──────────┘        ┌──reabrir────┘  └──archivar──▶ archivado
 *      └───────────── reactivar ◀──────────────────────────────────────────────────┘
 *
 * Publicar CONGELA un snapshot inmutable de la versión vigente. Reabrir/reactivar
 * abren una NUEVA versión de trabajo (bump), para no pisar lo ya publicado.
 */

export type EstadoPublicacion = 'borrador' | 'revision' | 'publicado' | 'archivado';

export type AccionPublicacion =
  | 'enviar_a_revision'
  | 'devolver'
  | 'publicar'
  | 'reabrir'
  | 'archivar'
  | 'reactivar';

/** Transiciones permitidas: estado actual → acción → estado destino. */
const TRANSICIONES: Record<
  EstadoPublicacion,
  Partial<Record<AccionPublicacion, EstadoPublicacion>>
> = {
  borrador: { enviar_a_revision: 'revision' },
  revision: { devolver: 'borrador', publicar: 'publicado' },
  publicado: { reabrir: 'borrador', archivar: 'archivado' },
  archivado: { reactivar: 'borrador' },
};

/** Error de dominio: transición no permitida desde el estado actual. */
export class TransicionInvalidaError extends Error {
  constructor(
    readonly estado: EstadoPublicacion,
    readonly accion: AccionPublicacion,
  ) {
    super(`No se puede '${accion}' desde el estado '${estado}'.`);
    this.name = 'TransicionInvalidaError';
  }
}

/** Devuelve el estado destino de aplicar `accion` a `actual`, o lanza si es inválida. */
export function transicionar(
  actual: EstadoPublicacion,
  accion: AccionPublicacion,
): EstadoPublicacion {
  const destino = TRANSICIONES[actual][accion];
  if (!destino) throw new TransicionInvalidaError(actual, accion);
  return destino;
}

/** Acciones válidas desde un estado (para pintar botones en el Studio). */
export function accionesPosibles(actual: EstadoPublicacion): AccionPublicacion[] {
  return Object.keys(TRANSICIONES[actual]) as AccionPublicacion[];
}

/** ¿La transición requiere congelar un snapshot de versión? (solo publicar). */
export function requiereSnapshot(accion: AccionPublicacion): boolean {
  return accion === 'publicar';
}

/**
 * ¿La transición abre una NUEVA versión de trabajo? Al reabrir/reactivar un
 * programa ya publicado/archivado se incrementa la versión, para que el próximo
 * publicado no colisione con el snapshot anterior (unique programa_id+version).
 */
export function requiereNuevaVersion(accion: AccionPublicacion): boolean {
  return accion === 'reabrir' || accion === 'reactivar';
}

/** Un programa solo es visible para el alumno cuando está publicado. */
export function esVisibleParaAlumno(estado: EstadoPublicacion): boolean {
  return estado === 'publicado';
}
