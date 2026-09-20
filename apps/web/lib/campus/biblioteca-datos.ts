import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type { DominioIaim } from './bitacora-contrato';
import type { BibliotecaData, CasoAcervo } from './biblioteca-contrato';

/**
 * Lectura de la Biblioteca de casos. Corre con RLS vía `comoAlumno`: el alumno solo
 * ve los casos PUBLICADOS (policy casos_biblioteca_select · 0010). Sin lógica de
 * dominio (§2). Ver biblioteca-contrato para el reparto REAL vs PENDIENTE (visor DICOM).
 */

/** Normaliza un jsonb que debería ser arreglo de strings a string[] seguro. */
function comoLista(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export async function getBiblioteca(userId: string): Promise<BibliotecaData> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        titulo: string;
        organo: string | null;
        dominio_iaim: DominioIaim | null;
        hallazgos_clave: unknown;
        diagnostico_correcto: string | null;
        puntos_aprendizaje: unknown;
        errores_comunes: unknown;
        curador: string | null;
        created_at: Date;
        tiene_dicom: boolean;
      }[]
    >`
      select
        cb.id, cb.titulo, cb.organo, cb.dominio_iaim,
        cb.hallazgos_clave, cb.diagnostico_correcto,
        cb.puntos_aprendizaje, cb.errores_comunes,
        p.nombre as curador,
        cb.created_at,
        (cb.estudio_estado = 'anonimizado') as tiene_dicom
      from lxp.casos_biblioteca cb
      left join lxp.perfiles p on p.user_id = cb.curador_id
      where cb.publicado
      order by cb.created_at desc`;

    const casos: CasoAcervo[] = rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      organo: r.organo,
      dominio: r.dominio_iaim,
      hallazgosClave: comoLista(r.hallazgos_clave),
      diagnostico: r.diagnostico_correcto,
      puntosAprendizaje: comoLista(r.puntos_aprendizaje),
      erroresComunes: comoLista(r.errores_comunes),
      curador: r.curador,
      fecha: r.created_at,
      tieneDicom: r.tiene_dicom,
    }));

    const organos = [...new Set(casos.map((c) => c.organo).filter((o): o is string => !!o))].sort(
      (a, b) => a.localeCompare(b, 'es'),
    );

    return { casos, organos };
  });
}

/** Detalle de UN caso del acervo (para la pantalla completa con visor · §4.7). */
export async function getCasoAcervo(userId: string, casoId: string): Promise<CasoAcervo | null> {
  return comoAlumno(userId, async (sql) => {
    const r = (
      await sql<
        {
          id: string;
          titulo: string;
          organo: string | null;
          dominio_iaim: DominioIaim | null;
          hallazgos_clave: unknown;
          diagnostico_correcto: string | null;
          puntos_aprendizaje: unknown;
          errores_comunes: unknown;
          curador: string | null;
          created_at: Date;
          tiene_dicom: boolean;
        }[]
      >`
        select
          cb.id, cb.titulo, cb.organo, cb.dominio_iaim,
          cb.hallazgos_clave, cb.diagnostico_correcto,
          cb.puntos_aprendizaje, cb.errores_comunes,
          p.nombre as curador, cb.created_at,
          (cb.estudio_estado = 'anonimizado') as tiene_dicom
        from lxp.casos_biblioteca cb
        left join lxp.perfiles p on p.user_id = cb.curador_id
        where cb.id = ${casoId} and cb.publicado
        limit 1`
    )[0];
    if (!r) return null;
    return {
      id: r.id,
      titulo: r.titulo,
      organo: r.organo,
      dominio: r.dominio_iaim,
      hallazgosClave: comoLista(r.hallazgos_clave),
      diagnostico: r.diagnostico_correcto,
      puntosAprendizaje: comoLista(r.puntos_aprendizaje),
      erroresComunes: comoLista(r.errores_comunes),
      curador: r.curador,
      fecha: r.created_at,
      tieneDicom: r.tiene_dicom,
    };
  });
}
