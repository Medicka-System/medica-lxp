'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';
import { afirmarFilas, comoStaff } from '@/lib/db.server';
import { comoTareaConfig, type RubricaCatalogo, type TareaConfig } from '@/lib/studio/tarea-contrato';

/** Convierte HTML del EditorRico a texto plano (fallback de instrucciones · como el foro). */
function aTextoPlano(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Server actions del editor de lección `tarea` (§5C · course builder).
 *
 * La tarea es `config-backed`: guarda `rubricaId` + lineamientos + valor en
 * `lxp.lecciones.config` con CRUD directo `web → Supabase` bajo RLS (Regla de Oro
 * §2 · `comoStaff` → policy `es_autoria`). La RÚBRICA no es inline: se SELECCIONA
 * del catálogo reutilizable (`lxp.rubricas`, familia `tareas`). El LISTADO del
 * catálogo va directo web→Supabase (§2 · el `api` solo la escribe, no la lista).
 */

function refrescar(programaId: string) {
  revalidatePath('/studio/programas');
  revalidatePath(`/studio/programas/${programaId}`);
}

/**
 * Lee el catálogo de rúbricas de la familia `tareas` (entregables · §5C). El staff
 * ve publicadas y borradores (RLS `rubricas_read`). Devuelve criterios para previa.
 */
export async function leerCatalogoRubricas(): Promise<RubricaCatalogo[]> {
  const { userId } = await requireAutoria();
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        nombre: string;
        tipo: 'estudios_reportes' | 'tareas';
        descripcion: string | null;
        publicado: boolean;
        criterios: unknown;
      }[]
    >`
      select id, nombre, tipo::text as tipo, descripcion, publicado, criterios
      from lxp.rubricas
      where tipo = 'tareas'
      order by publicado desc, nombre`;
    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      descripcion: r.descripcion,
      publicado: r.publicado,
      criterios: Array.isArray(r.criterios)
        ? (r.criterios as RubricaCatalogo['criterios'])
        : [],
    }));
  });
}

/**
 * Guarda la configuración de la tarea (rúbrica seleccionada + lineamientos + valor
 * + formato de entrega) en `lecciones.config`. Objeto único; el editor persiste el
 * conjunto. `rubricaId` puede ser null (aún sin rúbrica).
 */
export async function guardarTarea(
  programaId: string,
  leccionId: string,
  datos: TareaConfig,
): Promise<void> {
  const { userId } = await requireAutoria();
  const config = comoTareaConfig(datos);
  await comoStaff(userId, async (sql) => {
    // La entrega del alumno se ancla en `entregas.actividad_id` (FK a `actividades`,
    // NOT NULL hasta fase 3). Una lección tipo `tarea` guarda su config en
    // `lecciones.config`, no en `actividades`; por eso —igual que el foro (§5C)— esta
    // acción PUENTEA una actividad `tarea` de respaldo, idempotente: la reutiliza si ya
    // existe. La fuente de verdad de lo que el alumno ve (lineamientos, rúbrica, valor)
    // sigue siendo `lecciones.config`; a `actividades` solo se sincroniza título,
    // fallback de instrucciones y la rúbrica seleccionada (para la evaluación · Eco §7A).
    const lec = (
      await sql<{ nombre: string }[]>`select nombre from lxp.lecciones where id = ${leccionId} limit 1`
    )[0];
    const titulo = lec?.nombre?.trim() || 'Tarea';
    const instruccionesPlano = aTextoPlano(config.lineamientos ?? '') || null;

    const existente = (
      await sql<{ id: string }[]>`
        select id from lxp.actividades
        where leccion_id = ${leccionId} and tipo = 'tarea'
        order by orden, created_at limit 1`
    )[0];

    let actividadId: string;
    if (existente) {
      actividadId = existente.id;
      await sql`
        update lxp.actividades
        set titulo = ${titulo}, instrucciones = ${instruccionesPlano}, rubrica_id = ${config.rubricaId ?? null}
        where id = ${actividadId}`;
    } else {
      const orden = (
        await sql<{ n: number }[]>`
          select coalesce(max(orden) + 1, 0)::int as n from lxp.actividades where leccion_id = ${leccionId}`
      )[0]!.n;
      actividadId = (
        await sql<{ id: string }[]>`
          insert into lxp.actividades (leccion_id, tipo, titulo, instrucciones, rubrica_id, orden)
          values (${leccionId}, 'tarea'::lxp.actividad_tipo, ${titulo}, ${instruccionesPlano}, ${config.rubricaId ?? null}, ${orden})
          returning id`
      )[0]!.id;
    }

    const final: TareaConfig = { ...config, actividadId };
    afirmarFilas(await sql`update lxp.lecciones set config = ${sql.json(final as never)} where id = ${leccionId}`, 'config de tarea (lección)');
  });
  refrescar(programaId);
}
