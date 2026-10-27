/**
 * Motor de herencia programa→grupo (§6 · Sprint 4.5). Tipos + lógica PURA (sin I/O),
 * contrato ÚNICO compartido entre `apps/api` (dominio/Studio) y `apps/web` (vista del
 * alumno). Vive aquí para que AMBOS consumidores resuelvan con el MISMO código y el
 * MISMO shape: si la plantilla cambia de forma, los dos dejan de compilar (no hay
 * divergencia silenciosa). `apps/api` lo re-exporta desde `herencia.logic.ts`/
 * `herencia.types.ts` para no cambiar sus imports internos.
 *
 * La PLANTILLA es la fuente de verdad viva (el programa). El grupo la HEREDA y la
 * personaliza puntualmente con `grupo_overrides`. La VISTA EFECTIVA es la plantilla con
 * los overrides aplicados, marcando heredado vs personalizado. `resolverHerencia` NUNCA
 * muta la plantilla de entrada (un override es una capa de vista, no una escritura).
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Entidades del árbol que un grupo puede personalizar. */
export type EntidadOverride =
  | 'programa'
  | 'modulo'
  | 'leccion'
  | 'contenido'
  | 'actividad'
  // Modelo NUEVO · reemplazo de FUENTE de recurso por grupo (Paso 4b). Guardan la fuente
  // YA RESUELTA (ref/src/videotecaId/imagenes), no un recursoId:
  | 'bloque' // teoría: un bloque de lxp.bloques (imagen/pdf/galería/video-bloque)
  | 'leccion_config'; // video-lección: fuente en lecciones.config (entidad propia para no colisionar con 'leccion')

/** Override tal como vive en `lxp.grupo_overrides`. */
export interface OverrideCrudo {
  entidad: EntidadOverride;
  entidad_id: string;
  patch: Record<string, unknown>;
  /** Versión del programa vigente al aplicarlo (para detectar desfase). */
  aplicado_sobre_version: number;
}

// Plantilla (subconjunto relevante para la vista efectiva).

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

// Vista efectiva (plantilla + overrides).

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

// ── Lógica pura ─────────────────────────────────────────────────────────────

/**
 * Campos que un grupo PUEDE personalizar por entidad. Todo lo demás (ids, refs
 * estructurales, campos no listados) se rechaza: así el override jamás altera la
 * estructura de la plantilla. `oculto` es una marca de vista (no columna de la
 * plantilla): oculta la entidad para el grupo sin borrarla del programa.
 */
export const CAMPOS_PERMITIDOS: Record<EntidadOverride, readonly string[]> = {
  programa: ['nombre', 'descripcion'],
  modulo: ['nombre', 'descripcion', 'orden', 'horas', 'oculto'],
  leccion: ['nombre', 'descripcion', 'orden', 'oculto'],
  contenido: ['titulo', 'recurso_ref', 'cuerpo', 'orden', 'oculto'],
  actividad: ['titulo', 'instrucciones', 'orden', 'oculto'],
  // Reemplazo de FUENTE (Paso 4b/4c): campos de fuente que viven en el `config` del bloque /
  // de la lección. Se guardan ya resueltos; el alumno los overlaya en getLeccion y el lector
  // firma/reproduce. `contentId` = re-apuntar un H5P a otro contenido ya autorado (4c, solo
  // biblioteca). (xapi/scorm quedan fuera: su lanzador es "pendiente de API" · frente propio.)
  bloque: ['ref', 'src', 'videotecaId', 'url', 'imagenes', 'contentId'],
  leccion_config: ['videotecaId', 'url', 'contentId'],
};

/** Clave de marca de vista (no se mergea como dato de la plantilla). */
const CLAVE_OCULTO = 'oculto';

export interface PatchValidado {
  /** Patch con solo las claves permitidas (sin `oculto`, que va a meta). */
  limpio: Record<string, unknown>;
  /** ¿El patch pide ocultar la entidad? */
  oculto: boolean;
  /** Claves del patch que se rechazaron por no estar permitidas. */
  rechazadas: string[];
}

/**
 * Filtra un patch contra la whitelist de la entidad. Devuelve el patch limpio, la
 * marca `oculto` y las claves rechazadas (para que el borde decida 400).
 */
export function validarPatch(
  entidad: EntidadOverride,
  patch: Record<string, unknown>,
): PatchValidado {
  const permitidas = new Set(CAMPOS_PERMITIDOS[entidad]);
  const limpio: Record<string, unknown> = {};
  const rechazadas: string[] = [];
  let oculto = false;

  for (const [clave, valor] of Object.entries(patch)) {
    if (!permitidas.has(clave)) {
      rechazadas.push(clave);
      continue;
    }
    if (clave === CLAVE_OCULTO) {
      oculto = Boolean(valor);
      continue;
    }
    limpio[clave] = valor;
  }
  return { limpio, oculto, rechazadas };
}

/** Índice de overrides por `entidad:entidad_id` para lookup O(1). */
function indexar(overrides: OverrideCrudo[]): Map<string, OverrideCrudo> {
  const idx = new Map<string, OverrideCrudo>();
  for (const o of overrides) idx.set(`${o.entidad}:${o.entidad_id}`, o);
  return idx;
}

/** Aplica un override (si existe) a un nodo, devolviendo copia + meta. Nunca muta. */
function aplicar<T extends object>(
  entidad: EntidadOverride,
  original: T,
  override: OverrideCrudo | undefined,
): { nodo: T; meta: MetaHerencia } {
  if (!override) {
    return {
      nodo: { ...original },
      meta: { personalizado: false, oculto: false, camposPersonalizados: [] },
    };
  }
  const { limpio, oculto } = validarPatch(entidad, override.patch);
  const nodo = { ...original } as Record<string, unknown>;
  const campos: string[] = [];
  for (const [clave, valor] of Object.entries(limpio)) {
    // Solo cuenta como personalización si el valor DIFIERE de la plantilla.
    if (nodo[clave] !== valor) {
      nodo[clave] = valor;
      campos.push(clave);
    }
  }
  const personalizado = campos.length > 0 || oculto;
  return {
    nodo: nodo as T,
    meta: { personalizado, oculto, camposPersonalizados: campos },
  };
}

/** Ordena por `orden` y desempata por `id` (estable e independiente del origen). */
function porOrden<T extends { orden: number; id: string }>(a: T, b: T): number {
  return a.orden - b.orden || a.id.localeCompare(b.id);
}

/**
 * Resuelve la vista efectiva de un grupo: plantilla + overrides. Marca heredado vs
 * personalizado por nodo, respeta reordenamientos y ocultamientos del grupo, y
 * NO muta la plantilla de entrada.
 */
export function resolverHerencia(
  plantilla: ProgramaTpl,
  overrides: OverrideCrudo[],
): VistaEfectiva {
  const idx = indexar(overrides);
  let personalizaciones = 0;
  let ocultos = 0;
  let lecciones = 0;

  // Programa
  const prog = aplicar('programa', plantilla, idx.get(`programa:${plantilla.id}`));
  if (prog.meta.personalizado) personalizaciones++;

  // Módulos → lecciones → contenidos/actividades
  const modulos: ModuloResuelto[] = plantilla.modulos
    .map((m: ModuloTpl): ModuloResuelto => {
      const rm = aplicar('modulo', m, idx.get(`modulo:${m.id}`));
      if (rm.meta.personalizado) personalizaciones++;
      if (rm.meta.oculto) ocultos++;

      const leccionesResueltas: LeccionResuelta[] = m.lecciones
        .map((l: LeccionTpl): LeccionResuelta => {
          lecciones++;
          const rl = aplicar('leccion', l, idx.get(`leccion:${l.id}`));
          if (rl.meta.personalizado) personalizaciones++;
          if (rl.meta.oculto) ocultos++;

          const contenidos: ContenidoResuelto[] = l.contenidos
            .map((c: ContenidoTpl): ContenidoResuelto => {
              const rc = aplicar('contenido', c, idx.get(`contenido:${c.id}`));
              if (rc.meta.personalizado) personalizaciones++;
              if (rc.meta.oculto) ocultos++;
              return { ...rc.nodo, herencia: rc.meta };
            })
            .sort(porOrden);

          const actividades: ActividadResuelta[] = l.actividades
            .map((a: ActividadTpl): ActividadResuelta => {
              const ra = aplicar('actividad', a, idx.get(`actividad:${a.id}`));
              if (ra.meta.personalizado) personalizaciones++;
              if (ra.meta.oculto) ocultos++;
              return { ...ra.nodo, herencia: ra.meta };
            })
            .sort(porOrden);

          const { contenidos: _c, actividades: _a, ...base } = rl.nodo;
          return { ...base, contenidos, actividades, herencia: rl.meta };
        })
        .sort(porOrden);

      const { lecciones: _l, ...base } = rm.nodo;
      return { ...base, lecciones: leccionesResueltas, herencia: rm.meta };
    })
    .sort(porOrden);

  return {
    programa: {
      id: prog.nodo.id,
      nombre: prog.nodo.nombre,
      descripcion: prog.nodo.descripcion,
      version: plantilla.version,
      publicado: plantilla.publicado,
      herencia: prog.meta,
    },
    modulos,
    resync: detectarResync(plantilla, overrides),
    resumen: {
      modulos: plantilla.modulos.length,
      lecciones,
      personalizaciones,
      ocultos,
    },
  };
}

/** Todos los ids de la plantilla, por entidad (para detectar overrides huérfanos). */
function idsDePlantilla(plantilla: ProgramaTpl): Record<EntidadOverride, Set<string>> {
  const ids: Record<EntidadOverride, Set<string>> = {
    programa: new Set([plantilla.id]),
    modulo: new Set(),
    leccion: new Set(),
    contenido: new Set(),
    actividad: new Set(),
    bloque: new Set(),
    leccion_config: new Set(),
  };
  for (const m of plantilla.modulos) {
    ids.modulo.add(m.id);
    for (const l of m.lecciones) {
      ids.leccion.add(l.id);
      // 'leccion_config' (fuente de la lección) referencia el mismo nodo lección.
      ids.leccion_config.add(l.id);
      for (const c of l.contenidos) ids.contenido.add(c.id);
      for (const a of l.actividades) ids.actividad.add(a.id);
      for (const b of l.bloques ?? []) ids.bloque.add(b.id);
    }
  }
  return ids;
}

/** ¿La entidad referida por un override existe en la plantilla actual? */
export function existeEntidad(
  plantilla: ProgramaTpl,
  entidad: EntidadOverride,
  entidadId: string,
): boolean {
  return idsDePlantilla(plantilla)[entidad].has(entidadId);
}

/**
 * Overrides que necesitan revisión (aviso de re-sincronización · Sprint 4.5):
 *  - `huerfano`: la entidad ya no existe en la plantilla (se eliminó/renombró).
 *  - `desfasado`: la plantilla avanzó de versión desde que se aplicó el override.
 */
export function detectarResync(
  plantilla: ProgramaTpl,
  overrides: OverrideCrudo[],
): AvisoResync[] {
  const ids = idsDePlantilla(plantilla);
  const avisos: AvisoResync[] = [];
  for (const o of overrides) {
    const base = {
      entidad: o.entidad,
      entidad_id: o.entidad_id,
      aplicado_sobre_version: o.aplicado_sobre_version,
      version_actual: plantilla.version,
    };
    if (!ids[o.entidad].has(o.entidad_id)) {
      avisos.push({ ...base, motivo: 'huerfano' });
    } else if (o.aplicado_sobre_version < plantilla.version) {
      avisos.push({ ...base, motivo: 'desfasado' });
    }
  }
  return avisos;
}
