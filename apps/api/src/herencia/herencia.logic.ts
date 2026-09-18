/**
 * Lógica PURA de la herencia programa→grupo (§6 · Sprint 4.5). Sin I/O: recibe la
 * plantilla y los overrides ya cargados y devuelve la vista efectiva. Testeable en
 * aislamiento (herencia.logic.spec.ts).
 *
 * Garantía central: `resolverHerencia` NUNCA muta la plantilla de entrada — un
 * override es una capa de vista sobre la plantilla, no una escritura sobre ella
 * ("un override no rompe la plantilla" · DoD Sprint 4.5).
 */
import type {
  ActividadResuelta,
  ActividadTpl,
  AvisoResync,
  ContenidoResuelto,
  ContenidoTpl,
  EntidadOverride,
  LeccionResuelta,
  LeccionTpl,
  MetaHerencia,
  ModuloResuelto,
  ModuloTpl,
  OverrideCrudo,
  ProgramaTpl,
  VistaEfectiva,
} from './herencia.types';

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
  };
  for (const m of plantilla.modulos) {
    ids.modulo.add(m.id);
    for (const l of m.lecciones) {
      ids.leccion.add(l.id);
      for (const c of l.contenidos) ids.contenido.add(c.id);
      for (const a of l.actividades) ids.actividad.add(a.id);
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
