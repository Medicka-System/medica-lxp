'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import { comoTareaConfig, type RubricaCatalogo, type TareaConfig } from '@/lib/studio/tarea-contrato';

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
    await sql`update lxp.lecciones set config = ${sql.json(config as never)} where id = ${leccionId}`;
  });
  refrescar(programaId);
}
