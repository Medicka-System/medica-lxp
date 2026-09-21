/**
 * Tipos de la herencia programa→grupo (§6 · Sprint 4.5).
 *
 * La PLANTILLA es la fuente de verdad viva (el programa). El grupo la HEREDA y la
 * personaliza puntualmente con `grupo_overrides`. La VISTA EFECTIVA de un grupo es
 * la plantilla con los overrides aplicados, marcando qué quedó heredado vs
 * personalizado. La plantilla nunca se muta al resolver (un override no la rompe).
 *
 * Estos tipos viven en `api` (no en `packages/shared`): son contrato interno del
 * dominio. El `web` consume el JSON del endpoint, no importa estas formas.
 */

/** Entidades del árbol que un grupo puede personalizar. */
export type EntidadOverride =
  | 'programa'
  | 'modulo'
  | 'leccion'
  | 'contenido'
  | 'actividad';

/** Override tal como vive en `lxp.grupo_overrides`. */
export interface OverrideCrudo {
  entidad: EntidadOverride;
  entidad_id: string;
  patch: Record<string, unknown>;
  /** Versión del programa vigente al aplicarlo (para detectar desfase). */
  aplicado_sobre_version: number;
}

// ── Plantilla (subconjunto relevante para la vista efectiva) ──────────────────

export interface ContenidoTpl {
  id: string;
  tipo: string;
  titulo: string;
  recurso_ref: string | null;
  cuerpo: string | null;
  orden: number;
}

export interface ActividadTpl {
  id: string;
  tipo: string;
  titulo: string;
  instrucciones: string | null;
  orden: number;
}

/**
 * Bloque de teoría del modelo NUEVO (`lxp.bloques` · mig 0023). Passthrough en la
 * herencia: se hereda tal cual (no hay override por bloque en esta fase).
 */
export interface BloqueTpl {
  id: string;
  orden: number;
  tipo_bloque: string;
  config: unknown;
}

export interface LeccionTpl {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /**
   * Modelo NUEVO (mig 0023, opcional en esta fase aditiva): tipo de la lección +
   * su `config` jsonb + `bloques` de teoría. Se HEREDAN sin override por ahora
   * (passthrough): el grupo aún no los personaliza. El modelo viejo
   * (contenidos/actividades) sigue vivo abajo.
   */
  tipo?: string;
  config?: unknown;
  bloques?: BloqueTpl[];
  contenidos: ContenidoTpl[];
  actividades: ActividadTpl[];
}

export interface ModuloTpl {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  horas: number;
  lecciones: LeccionTpl[];
}

export interface ProgramaTpl {
  id: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  publicado: boolean;
  modulos: ModuloTpl[];
}

// ── Vista efectiva (plantilla + overrides) ────────────────────────────────────

/** Metadatos de herencia por nodo de la vista efectiva. */
export interface MetaHerencia {
  /** ¿Tiene un override aplicado sobre la plantilla? */
  personalizado: boolean;
  /** ¿El grupo lo oculta? (marca de vista; la plantilla lo conserva). */
  oculto: boolean;
  /** Campos cuyo valor difiere de la plantilla por el override. */
  camposPersonalizados: string[];
}

export type ConHerencia<T> = T & { herencia: MetaHerencia };

export type ContenidoResuelto = ConHerencia<ContenidoTpl>;
export type ActividadResuelta = ConHerencia<ActividadTpl>;
export type LeccionResuelta = ConHerencia<
  Omit<LeccionTpl, 'contenidos' | 'actividades'>
> & {
  contenidos: ContenidoResuelto[];
  actividades: ActividadResuelta[];
};
export type ModuloResuelto = ConHerencia<Omit<ModuloTpl, 'lecciones'>> & {
  lecciones: LeccionResuelta[];
};

/** Override que ya no cuadra con la plantilla (necesita re-sincronización). */
export interface AvisoResync {
  entidad: EntidadOverride;
  entidad_id: string;
  /** 'huerfano' = la entidad ya no existe; 'desfasado' = la plantilla avanzó. */
  motivo: 'huerfano' | 'desfasado';
  aplicado_sobre_version: number;
  version_actual: number;
}

/** Conteos rápidos de la vista efectiva del grupo. */
export interface ResumenHerencia {
  modulos: number;
  lecciones: number;
  personalizaciones: number;
  ocultos: number;
}

/** Resultado de resolver la herencia de un grupo. */
export interface VistaEfectiva {
  programa: {
    id: string;
    nombre: string;
    descripcion: string | null;
    version: number;
    publicado: boolean;
    herencia: MetaHerencia;
  };
  modulos: ModuloResuelto[];
  resync: AvisoResync[];
  resumen: ResumenHerencia;
}
