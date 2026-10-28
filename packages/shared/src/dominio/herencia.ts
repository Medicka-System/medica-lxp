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

// ── Contenido PROPIO del grupo (Opción 1A · aditivo sobre lo heredado) ──────────
// Una entidad propia es una fila real (grupo_id) que el grupo AGREGA; se FUSIONA en el
// árbol heredado en su posición (puntero `despues_de` a una entidad hermana heredada),
// sin tocar la plantilla ni los overrides. NO tiene overrides (es directamente editable).

/** De dónde sale el nodo en la vista resuelta. 'propio' = agregado por el grupo. */
export type Origen = 'heredado' | 'propio';

/** Módulo propio del grupo (subárbol completo: lecciones→contenidos/actividades/bloques). */
export interface ModuloPropio extends ModuloTpl {
  /** Va DESPUÉS de este módulo hermano (id heredado). NULL = al inicio del temario. */
  despues_de: string | null;
}
/** Lección propia bajo un módulo existente (heredado o propio). */
export interface LeccionPropia extends LeccionTpl {
  /** Módulo al que se adjunta. */
  modulo_id: string;
  /** Va DESPUÉS de esta lección hermana (id). NULL = al inicio del módulo. */
  despues_de: string | null;
}
/** Bloque de teoría propio bajo una lección existente (heredada o propia). */
export interface BloquePropio extends BloqueTpl {
  /** Lección a la que se adjunta. */
  leccion_id: string;
  /** Va DESPUÉS de este bloque hermano (id). NULL = al inicio de la lección. */
  despues_de: string | null;
  /**
   * Copy-on-write por bloque (Paso 4): reemplaza a este bloque HEREDADO en el grupo —
   * lo SUPRIME en su posición y se muestra en su lugar. NULL = bloque propio ADITIVO
   * (se inserta sin suprimir nada, como hasta ahora).
   */
  reemplaza_a?: string | null;
}
/** El contenido propio de UN grupo, por nivel de adjunción. */
export interface ContenidoPropioGrupo {
  modulos?: ModuloPropio[];
  lecciones?: LeccionPropia[];
  bloques?: BloquePropio[];
}

// Vista efectiva (plantilla + overrides + propias).

/** Metadatos de herencia por nodo de la vista efectiva. */
export interface MetaHerencia {
  /** ¿Tiene un override aplicado sobre la plantilla? (siempre false en lo propio). */
  personalizado: boolean;
  /** ¿El grupo lo oculta? (marca de vista; la plantilla lo conserva). */
  oculto: boolean;
  /** Campos cuyo valor difiere de la plantilla por el override. */
  camposPersonalizados: string[];
  /** 'heredado' (del programa) | 'propio' (agregado por el grupo). Solo informa al diseñador. */
  origen: Origen;
}

export type ConHerencia<T> = T & { herencia: MetaHerencia };

export type ContenidoResuelto = ConHerencia<ContenidoTpl>;
export type ActividadResuelta = ConHerencia<ActividadTpl>;
/** Bloque resuelto: passthrough + marca de origen (para que el diseñador distinga propio). */
export type BloqueResuelto = BloqueTpl & { origen: Origen };
export type LeccionResuelta = ConHerencia<
  Omit<LeccionTpl, 'contenidos' | 'actividades' | 'bloques'>
> & {
  contenidos: ContenidoResuelto[];
  actividades: ActividadResuelta[];
  bloques?: BloqueResuelto[];
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
      meta: { personalizado: false, oculto: false, camposPersonalizados: [], origen: 'heredado' },
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
    meta: { personalizado, oculto, camposPersonalizados: campos, origen: 'heredado' },
  };
}

/** Meta de un nodo PROPIO del grupo: sin override, marcado como 'propio'. */
function metaPropia(): MetaHerencia {
  return { personalizado: false, oculto: false, camposPersonalizados: [], origen: 'propio' };
}

/**
 * Fusiona entidades PROPIAS en una lista base HEREDADA (ya ordenada), respetando la
 * posición: cada propia va DESPUÉS de su ancla (`despues_de`, un id de la base). Ancla
 * NULL o inexistente (borrada) → al inicio. Entre propias con el mismo ancla, por `orden`.
 * NO muta la base; devuelve una lista nueva.
 */
interface Posicionable<N> {
  id: string;
  orden: number;
  despues_de: string | null;
  nodo: N;
}
function fusionarPosicion<N>(base: Posicionable<N>[], propios: Posicionable<N>[]): N[] {
  if (propios.length === 0) return base.map((b) => b.nodo);
  const idsBase = new Set(base.map((b) => b.id));
  const cmp = (a: Posicionable<N>, b: Posicionable<N>): number =>
    a.orden - b.orden || a.id.localeCompare(b.id);
  const porAncla = new Map<string, Posicionable<N>[]>();
  const alInicio: Posicionable<N>[] = [];
  for (const p of propios) {
    if (p.despues_de === null || !idsBase.has(p.despues_de)) {
      alInicio.push(p);
    } else {
      const arr = porAncla.get(p.despues_de) ?? [];
      arr.push(p);
      porAncla.set(p.despues_de, arr);
    }
  }
  alInicio.sort(cmp);
  for (const arr of porAncla.values()) arr.sort(cmp);
  const out: N[] = alInicio.map((p) => p.nodo);
  for (const b of base) {
    out.push(b.nodo);
    const despues = porAncla.get(b.id);
    if (despues) for (const p of despues) out.push(p.nodo);
  }
  return out;
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
  propias: ContenidoPropioGrupo = {},
): VistaEfectiva {
  const idx = indexar(overrides);
  const cont = { personalizaciones: 0, ocultos: 0, lecciones: 0 };

  // Propias indexadas por punto de adjunción.
  const leccionesPorModulo = new Map<string, LeccionPropia[]>();
  for (const l of propias.lecciones ?? []) {
    const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
    arr.push(l);
    leccionesPorModulo.set(l.modulo_id, arr);
  }
  const bloquesPorLeccion = new Map<string, BloquePropio[]>();
  for (const b of propias.bloques ?? []) {
    const arr = bloquesPorLeccion.get(b.leccion_id) ?? [];
    arr.push(b);
    bloquesPorLeccion.set(b.leccion_id, arr);
  }

  // Bloques de una lección: heredados (con origen) + propios fusionados por posición.
  // Copy-on-write por bloque (Paso 4): un propio con `reemplaza_a` SUPRIME al heredado en su
  // lugar; el resto de la lección sigue heredando. Un propio SIN `reemplaza_a` se inserta
  // aditivo (como hasta ahora). La plantilla NUNCA se muta.
  const resolverBloques = (l: Pick<LeccionTpl, 'id' | 'bloques'>, origen: Origen): BloqueResuelto[] => {
    const propiosRaw = bloquesPorLeccion.get(l.id) ?? [];
    const reemplazados = new Set(
      propiosRaw.filter((b) => b.reemplaza_a).map((b) => b.reemplaza_a as string),
    );
    const base: Posicionable<BloqueResuelto>[] = (l.bloques ?? [])
      .filter((b) => !reemplazados.has(b.id))
      .slice()
      .sort(porOrden)
      .map((b) => ({ id: b.id, orden: b.orden, despues_de: null, nodo: { ...b, origen } }));
    const propios: Posicionable<BloqueResuelto>[] = propiosRaw.map((b) => ({
      id: b.id,
      orden: b.orden,
      despues_de: b.despues_de,
      nodo: { id: b.id, orden: b.orden, tipo_bloque: b.tipo_bloque, config: b.config, origen: 'propio' },
    }));
    return fusionarPosicion(base, propios);
  };

  // Resuelve una lección (heredada → aplica overrides; propia → sin override).
  const resolverLeccion = (l: LeccionTpl, origen: Origen): LeccionResuelta => {
    cont.lecciones++;
    const rl =
      origen === 'heredado'
        ? aplicar('leccion', l, idx.get(`leccion:${l.id}`))
        : { nodo: { ...l }, meta: metaPropia() };
    if (rl.meta.personalizado) cont.personalizaciones++;
    if (rl.meta.oculto) cont.ocultos++;

    const contenidos: ContenidoResuelto[] = (l.contenidos ?? [])
      .map((c) => {
        const rc =
          origen === 'heredado'
            ? aplicar('contenido', c, idx.get(`contenido:${c.id}`))
            : { nodo: { ...c }, meta: metaPropia() };
        if (rc.meta.personalizado) cont.personalizaciones++;
        if (rc.meta.oculto) cont.ocultos++;
        return { ...rc.nodo, herencia: rc.meta };
      })
      .sort(porOrden);
    const actividades: ActividadResuelta[] = (l.actividades ?? [])
      .map((a) => {
        const ra =
          origen === 'heredado'
            ? aplicar('actividad', a, idx.get(`actividad:${a.id}`))
            : { nodo: { ...a }, meta: metaPropia() };
        if (ra.meta.personalizado) cont.personalizaciones++;
        if (ra.meta.oculto) cont.ocultos++;
        return { ...ra.nodo, herencia: ra.meta };
      })
      .sort(porOrden);
    const bloques = resolverBloques(l, origen);

    // Quita contenidos/actividades/bloques (y los extras de una propia) de la base.
    const { contenidos: _c, actividades: _a, bloques: _b, ...base } = rl.nodo as LeccionTpl & {
      modulo_id?: string;
      despues_de?: string | null;
    };
    delete (base as { modulo_id?: string }).modulo_id;
    delete (base as { despues_de?: string | null }).despues_de;
    return { ...base, contenidos, actividades, bloques, herencia: rl.meta };
  };

  // Resuelve un módulo (heredado → overrides; propio → sin override). Fusiona sus lecciones
  // propias (adjuntas por modulo_id) entre las heredadas, por posición.
  const resolverModulo = (m: ModuloTpl, origen: Origen): ModuloResuelto => {
    const rm =
      origen === 'heredado'
        ? aplicar('modulo', m, idx.get(`modulo:${m.id}`))
        : { nodo: { ...m }, meta: metaPropia() };
    if (rm.meta.personalizado) cont.personalizaciones++;
    if (rm.meta.oculto) cont.ocultos++;

    const baseLecciones: Posicionable<LeccionResuelta>[] = m.lecciones
      .map((l) => resolverLeccion(l, origen))
      .sort(porOrden)
      .map((lr) => ({ id: lr.id, orden: lr.orden, despues_de: null, nodo: lr }));
    const propiasLec: Posicionable<LeccionResuelta>[] = (leccionesPorModulo.get(m.id) ?? []).map((lp) => ({
      id: lp.id,
      orden: lp.orden,
      despues_de: lp.despues_de,
      nodo: resolverLeccion(lp, 'propio'),
    }));
    const lecciones = fusionarPosicion(baseLecciones, propiasLec);

    const { lecciones: _l, ...base } = rm.nodo as ModuloTpl & { despues_de?: string | null };
    delete (base as { despues_de?: string | null }).despues_de;
    return { ...base, lecciones, herencia: rm.meta };
  };

  // Programa (no personalizable estructuralmente; solo nombre/descripcion vía override).
  const prog = aplicar('programa', plantilla, idx.get(`programa:${plantilla.id}`));
  if (prog.meta.personalizado) cont.personalizaciones++;

  // Módulos heredados (base) + módulos propios, fusionados por posición.
  const baseModulos: Posicionable<ModuloResuelto>[] = plantilla.modulos
    .map((m) => resolverModulo(m, 'heredado'))
    .sort(porOrden)
    .map((mr) => ({ id: mr.id, orden: mr.orden, despues_de: null, nodo: mr }));
  const propiosModulos: Posicionable<ModuloResuelto>[] = (propias.modulos ?? []).map((mp) => ({
    id: mp.id,
    orden: mp.orden,
    despues_de: mp.despues_de,
    nodo: resolverModulo(mp, 'propio'),
  }));
  const modulos = fusionarPosicion(baseModulos, propiosModulos);

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
      modulos: modulos.length,
      lecciones: cont.lecciones,
      personalizaciones: cont.personalizaciones,
      ocultos: cont.ocultos,
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
