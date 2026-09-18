'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import type { TipoBloque } from '@/lib/studio/datos';

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
  revalidatePath('/programas');
  if (programaId) revalidatePath(`/programas/${programaId}`);
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
  revalidatePath('/programas');
  redirect(`/programas/${id}`);
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

export async function actualizarHorasModulo(
  programaId: string,
  moduloId: string,
  horas: number,
): Promise<void> {
  const { userId } = await requireAutoria();
  const valor = Number.isFinite(horas) && horas >= 0 ? horas : 0;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.modulos set horas = ${valor} where id = ${moduloId}`;
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
