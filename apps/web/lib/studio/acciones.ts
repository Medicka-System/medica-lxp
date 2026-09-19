'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import type { TipoBloque, TipoHerramienta } from '@/lib/studio/datos';
import type { DominioIaim } from '@/lib/studio/casos-contrato';

/**
 * Server actions del Studio de autoría (§5B). Son CRUD simple `web → Supabase`
 * bajo RLS (Regla de Oro §2 — NO pasan por NestJS): cada acción corre con
 * `comoStaff`, así que las policies `lxp.es_autoria()` son el segundo candado.
 *
 * PENDIENTE DE API (dominio · §2, SPRINTS 4.5): la PUBLICACIÓN con versionado real
 * (snapshot de la versión, "cambios sin publicar" calculados, aviso a los docentes
 * de los grupos, estado `revisión`) vive en `apps/api`. Aquí solo se alterna la
 * visibilidad `publicado` (columna simple) para que un borrador no lo vea el alumno.
 */

/** video/teoría/H5P → tabla `contenidos`; tarea/autoevaluación/foro → `actividades`. */
const BLOQUE_A_CONTENIDO: Partial<Record<TipoBloque, string>> = {
  video: 'video',
  teoria: 'texto',
  h5p: 'h5p',
};
const BLOQUE_A_ACTIVIDAD: Partial<Record<TipoBloque, string>> = {
  tarea: 'tarea',
  autoevaluacion: 'autoevaluacion',
  foro: 'foro',
};

function refrescar(programaId?: string) {
  revalidatePath('/studio/programas');
  if (programaId) revalidatePath(`/studio/programas/${programaId}`);
}

// ── Programa ───────────────────────────────────────────────────────────────────
export async function crearPrograma(): Promise<void> {
  const { userId } = await requireAutoria();
  const id = await comoStaff(userId, async (sql) => {
    const rows = await sql<{ id: string }[]>`
      insert into lxp.programas (nombre, publicado, version)
      values ('Programa sin título', false, 1) returning id`;
    return rows[0]!.id;
  });
  revalidatePath('/studio/programas');
  redirect(`/studio/programas/${id}`);
}

export async function renombrarPrograma(programaId: string, nombre: string): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = nombre.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.programas set nombre = ${limpio} where id = ${programaId}`;
  });
  refrescar(programaId);
}

/** Alterna la visibilidad. El versionado/aviso real es PENDIENTE DE API (ver cabecera). */
export async function publicarPrograma(programaId: string, publicado: boolean): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.programas set publicado = ${publicado} where id = ${programaId}`;
  });
  refrescar(programaId);
}

// ── Herramientas (administración · plantillas/calculadoras/simuladores) ─────────
// La ESTRUCTURA de administración (crear/renombrar/publicar) es CRUD real bajo RLS
// es_autoria. El CONTENIDO CLÍNICO (estructura de reporte, fórmula, casos_base /
// prompts) se edita en sus sprints propios (6.5 reportes, 7 simuladores, 8 calc.) —
// aquí queda como placeholder; no se inventa.
function refrescarHerramienta(tipo: TipoHerramienta) {
  revalidatePath(`/studio/herramientas/${tipo}`);
}

export async function crearHerramienta(tipo: TipoHerramienta): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    if (tipo === 'plantillas') {
      await sql`insert into lxp.plantillas_reporte (nombre, publicado) values ('Plantilla sin título', false)`;
    } else if (tipo === 'calculadoras') {
      // `clave` es única y NOT NULL → se genera una a partir de un uuid.
      await sql`insert into lxp.calculadoras (clave, nombre, publicado)
                values ('calc-' || substr(gen_random_uuid()::text, 1, 8), 'Calculadora sin título', false)`;
    } else {
      await sql`insert into lxp.simuladores (tipo, nombre, publicado)
                values ('interpretacion'::lxp.simulador_tipo, 'Simulador sin título', false)`;
    }
  });
  refrescarHerramienta(tipo);
}

const TABLA_HERRAMIENTA: Record<TipoHerramienta, string> = {
  plantillas: 'lxp.plantillas_reporte',
  calculadoras: 'lxp.calculadoras',
  simuladores: 'lxp.simuladores',
};

export async function renombrarHerramienta(
  tipo: TipoHerramienta,
  id: string,
  nombre: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = nombre.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    await sql.unsafe(`update ${TABLA_HERRAMIENTA[tipo]} set nombre = $1 where id = $2`, [limpio, id]);
  });
  refrescarHerramienta(tipo);
}

export async function publicarHerramienta(
  tipo: TipoHerramienta,
  id: string,
  publicado: boolean,
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql.unsafe(`update ${TABLA_HERRAMIENTA[tipo]} set publicado = $1 where id = $2`, [publicado, id]);
  });
  refrescarHerramienta(tipo);
}

// ── Casos (curaduría · lxp.casos_biblioteca, escribe es_staff) ──────────────────
function refrescarCaso(casoId?: string) {
  revalidatePath('/studio/casos');
  if (casoId) revalidatePath(`/studio/casos/${casoId}`);
}

/** Crea un caso "por curar" cargado por staff (metadatos; el DICOM se adjunta luego
 *  vía el pipeline de ingesta · PENDIENTE 4.7). Abre el editor. */
export async function crearCaso(): Promise<void> {
  const { userId } = await requireAutoria();
  const id = await comoStaff(userId, async (sql) => {
    const rows = await sql<{ id: string }[]>`
      insert into lxp.casos_biblioteca (curador_id, titulo, publicado)
      values (${userId}, 'Caso sin título', false)
      returning id`;
    return rows[0]!.id;
  });
  revalidatePath('/studio/casos');
  redirect(`/studio/casos/${id}`);
}

/**
 * Guarda catalogación + VERDAD ESTRUCTURADA del caso (§7A). Las listas se guardan
 * como jsonb de strings. `dominio` null-safe. CRUD directo bajo RLS es_staff.
 */
export async function guardarCaso(
  casoId: string,
  datos: {
    titulo?: string;
    organo?: string;
    dominio?: DominioIaim | null;
    diagnostico?: string;
    hallazgosClave?: string[];
    puntosAprendizaje?: string[];
    erroresComunes?: string[];
  },
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    if (datos.titulo !== undefined) {
      const limpio = datos.titulo.trim();
      if (limpio) await sql`update lxp.casos_biblioteca set titulo = ${limpio} where id = ${casoId}`;
    }
    if (datos.organo !== undefined) {
      await sql`update lxp.casos_biblioteca set organo = ${datos.organo || null} where id = ${casoId}`;
    }
    if (datos.dominio !== undefined) {
      if (datos.dominio) {
        await sql`update lxp.casos_biblioteca set dominio_iaim = ${datos.dominio}::lxp.dominio_iaim where id = ${casoId}`;
      } else {
        await sql`update lxp.casos_biblioteca set dominio_iaim = null where id = ${casoId}`;
      }
    }
    if (datos.diagnostico !== undefined) {
      await sql`update lxp.casos_biblioteca set diagnostico_correcto = ${datos.diagnostico || null} where id = ${casoId}`;
    }
    if (datos.hallazgosClave !== undefined) {
      await sql`update lxp.casos_biblioteca set hallazgos_clave = ${sql.json(datos.hallazgosClave)} where id = ${casoId}`;
    }
    if (datos.puntosAprendizaje !== undefined) {
      await sql`update lxp.casos_biblioteca set puntos_aprendizaje = ${sql.json(datos.puntosAprendizaje)} where id = ${casoId}`;
    }
    if (datos.erroresComunes !== undefined) {
      await sql`update lxp.casos_biblioteca set errores_comunes = ${sql.json(datos.erroresComunes)} where id = ${casoId}`;
    }
  });
  refrescarCaso(casoId);
}

/** Publica el caso a la Biblioteca (o lo regresa a "por curar"). */
export async function publicarCaso(casoId: string, publicado: boolean): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.casos_biblioteca set publicado = ${publicado} where id = ${casoId}`;
  });
  refrescarCaso(casoId);
}

// ── Grupos (instancias del programa · §6) ──────────────────────────────────────
function refrescarGrupo(grupoId?: string) {
  revalidatePath('/studio/grupos');
  if (grupoId) revalidatePath(`/studio/grupos/${grupoId}`);
}

/** Instancia un grupo a partir de un programa. CRUD simple (Regla de Oro §2). */
export async function crearGrupo(datos: {
  programaId: string;
  nombre: string;
  modalidad: 'sincrono' | 'asincrono';
  fechaInicio?: string | null;
  fechaFin?: string | null;
}): Promise<void> {
  const { userId } = await requireAutoria();
  const nombre = datos.nombre.trim() || 'Grupo sin título';
  const inicio = datos.modalidad === 'sincrono' ? datos.fechaInicio || null : null;
  const fin = datos.modalidad === 'sincrono' ? datos.fechaFin || null : null;
  const id = await comoStaff(userId, async (sql) => {
    const rows = await sql<{ id: string }[]>`
      insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, fecha_fin)
      values (${datos.programaId}, ${nombre}, ${datos.modalidad}::lxp.modalidad, ${inicio}, ${fin})
      returning id`;
    return rows[0]!.id;
  });
  revalidatePath('/studio/grupos');
  redirect(`/studio/grupos/${id}`);
}

/** Edita los datos que el grupo SÍ posee: nombre, modalidad, fechas, docente. */
export async function actualizarGrupo(
  grupoId: string,
  datos: {
    nombre?: string;
    modalidad?: 'sincrono' | 'asincrono';
    fechaInicio?: string | null;
    fechaFin?: string | null;
    docenteId?: string | null;
  },
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    if (datos.nombre !== undefined) {
      const limpio = datos.nombre.trim();
      if (limpio) await sql`update lxp.grupos set nombre = ${limpio} where id = ${grupoId}`;
    }
    if (datos.modalidad !== undefined) {
      await sql`update lxp.grupos set modalidad = ${datos.modalidad}::lxp.modalidad where id = ${grupoId}`;
    }
    if (datos.fechaInicio !== undefined) {
      await sql`update lxp.grupos set fecha_inicio = ${datos.fechaInicio || null} where id = ${grupoId}`;
    }
    if (datos.fechaFin !== undefined) {
      await sql`update lxp.grupos set fecha_fin = ${datos.fechaFin || null} where id = ${grupoId}`;
    }
    if (datos.docenteId !== undefined) {
      await sql`update lxp.grupos set docente_id = ${datos.docenteId || null} where id = ${grupoId}`;
    }
  });
  refrescarGrupo(grupoId);
}

// ── Módulos ──────────────────────────────────────────────────────────────────
export async function crearModulo(programaId: string): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`
      insert into lxp.modulos (programa_id, nombre, orden, horas)
      values (
        ${programaId}, 'Módulo sin título',
        coalesce((select max(orden) + 1 from lxp.modulos where programa_id = ${programaId}), 0),
        0
      )`;
  });
  refrescar(programaId);
}

export async function renombrarModulo(
  programaId: string,
  moduloId: string,
  nombre: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = nombre.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.modulos set nombre = ${limpio} where id = ${moduloId}`;
  });
  refrescar(programaId);
}

export async function eliminarModulo(programaId: string, moduloId: string): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`delete from lxp.modulos where id = ${moduloId}`;
  });
  refrescar(programaId);
}

// ── Lecciones ──────────────────────────────────────────────────────────────────
export async function crearLeccion(programaId: string, moduloId: string): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`
      insert into lxp.lecciones (modulo_id, nombre, orden)
      values (
        ${moduloId}, 'Lección sin título',
        coalesce((select max(orden) + 1 from lxp.lecciones where modulo_id = ${moduloId}), 0)
      )`;
  });
  refrescar(programaId);
}

/**
 * Las horas acumulables se definen POR LECCIÓN (§5B · mig 0022). El módulo y el
 * programa muestran la SUMA (la mantiene el trigger `lecciones_recalc_horas`); no
 * hay campo de horas editable a nivel módulo.
 */
export async function actualizarHorasLeccion(
  programaId: string,
  leccionId: string,
  horas: number,
): Promise<void> {
  const { userId } = await requireAutoria();
  const valor = Number.isFinite(horas) && horas >= 0 ? horas : 0;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.lecciones set horas = ${valor} where id = ${leccionId}`;
  });
  refrescar(programaId);
}

export async function renombrarLeccion(
  programaId: string,
  leccionId: string,
  nombre: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = nombre.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.lecciones set nombre = ${limpio} where id = ${leccionId}`;
  });
  refrescar(programaId);
}

export async function eliminarLeccion(programaId: string, leccionId: string): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`delete from lxp.lecciones where id = ${leccionId}`;
  });
  refrescar(programaId);
}

// ── Bloques (contenido | actividad) ────────────────────────────────────────────
export async function crearBloque(
  programaId: string,
  leccionId: string,
  tipo: TipoBloque,
): Promise<void> {
  const { userId } = await requireAutoria();
  const comoContenido = BLOQUE_A_CONTENIDO[tipo];
  const comoActividad = BLOQUE_A_ACTIVIDAD[tipo];
  if (!comoContenido && !comoActividad) return;

  await comoStaff(userId, async (sql) => {
    // El orden es un espacio compartido por los bloques de la lección (contenidos +
    // actividades), así que el siguiente orden mira ambas tablas.
    const orden = (
      await sql<{ n: number }[]>`
        select coalesce(max(orden) + 1, 0)::int as n from (
          select orden from lxp.contenidos where leccion_id = ${leccionId}
          union all
          select orden from lxp.actividades where leccion_id = ${leccionId}
        ) t`
    )[0]!.n;

    if (comoContenido) {
      await sql`
        insert into lxp.contenidos (leccion_id, tipo, titulo, orden)
        values (${leccionId}, ${comoContenido}::lxp.contenido_tipo, 'Bloque sin título', ${orden})`;
    } else if (comoActividad) {
      await sql`
        insert into lxp.actividades (leccion_id, tipo, titulo, orden)
        values (${leccionId}, ${comoActividad}::lxp.actividad_tipo, 'Bloque sin título', ${orden})`;
    }
  });
  refrescar(programaId);
}

export async function renombrarBloque(
  programaId: string,
  fuente: 'contenido' | 'actividad',
  bloqueId: string,
  titulo: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = titulo.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    if (fuente === 'contenido') {
      await sql`update lxp.contenidos set titulo = ${limpio} where id = ${bloqueId}`;
    } else {
      await sql`update lxp.actividades set titulo = ${limpio} where id = ${bloqueId}`;
    }
  });
  refrescar(programaId);
}

export async function eliminarBloque(
  programaId: string,
  fuente: 'contenido' | 'actividad',
  bloqueId: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    if (fuente === 'contenido') {
      await sql`delete from lxp.contenidos where id = ${bloqueId}`;
    } else {
      await sql`delete from lxp.actividades where id = ${bloqueId}`;
    }
  });
  refrescar(programaId);
}

// ── Reordenar (intercambio con el vecino) ────────────────────────────────────
export async function moverModulo(
  programaId: string,
  moduloId: string,
  dir: 'arriba' | 'abajo',
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    const orden = await sql<{ id: string; orden: number }[]>`
      select id, orden from lxp.modulos where programa_id = ${programaId} order by orden, created_at`;
    await intercambiar(sql, 'lxp.modulos', orden, moduloId, dir);
  });
  refrescar(programaId);
}

export async function moverLeccion(
  programaId: string,
  moduloId: string,
  leccionId: string,
  dir: 'arriba' | 'abajo',
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    const orden = await sql<{ id: string; orden: number }[]>`
      select id, orden from lxp.lecciones where modulo_id = ${moduloId} order by orden, created_at`;
    await intercambiar(sql, 'lxp.lecciones', orden, leccionId, dir);
  });
  refrescar(programaId);
}

export async function moverBloque(
  programaId: string,
  leccionId: string,
  bloqueId: string,
  dir: 'arriba' | 'abajo',
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    // Los bloques viven en DOS tablas (contenidos + actividades) pero comparten un
    // solo espacio de `orden` en la lección. Se unen, se ordenan y se intercambia
    // el orden con el vecino, actualizando la tabla que corresponda a cada uno.
    const filas = await sql<{ id: string; fuente: string; orden: number }[]>`
      select id, 'contenido' as fuente, orden from lxp.contenidos where leccion_id = ${leccionId}
      union all
      select id, 'actividad' as fuente, orden from lxp.actividades where leccion_id = ${leccionId}
      order by orden`;
    const i = filas.findIndex((f) => f.id === bloqueId);
    if (i < 0) return;
    const j = dir === 'arriba' ? i - 1 : i + 1;
    if (j < 0 || j >= filas.length) return;
    const a = filas[i]!;
    const b = filas[j]!;
    const tabla = (f: string) => (f === 'contenido' ? 'lxp.contenidos' : 'lxp.actividades');
    await sql.unsafe(`update ${tabla(a.fuente)} set orden = $1 where id = $2`, [b.orden, a.id]);
    await sql.unsafe(`update ${tabla(b.fuente)} set orden = $1 where id = $2`, [a.orden, b.id]);
  });
  refrescar(programaId);
}

/**
 * Intercambia el `orden` de una fila con el de su vecino en la dirección dada.
 * `tabla` es un literal controlado (nunca entrada de usuario) → seguro con unsafe.
 */
async function intercambiar(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- el tx tipado de postgres.js
  sql: any,
  tabla: 'lxp.modulos' | 'lxp.lecciones',
  filas: { id: string; orden: number }[],
  id: string,
  dir: 'arriba' | 'abajo',
): Promise<void> {
  const i = filas.findIndex((f) => f.id === id);
  if (i < 0) return;
  const j = dir === 'arriba' ? i - 1 : i + 1;
  if (j < 0 || j >= filas.length) return;
  const a = filas[i]!;
  const b = filas[j]!;
  // Dos updates con valores intercambiados (orden no es único → sin colisión).
  await sql.unsafe(`update ${tabla} set orden = $1 where id = $2`, [b.orden, a.id]);
  await sql.unsafe(`update ${tabla} set orden = $1 where id = $2`, [a.orden, b.id]);
}
