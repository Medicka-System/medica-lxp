import 'server-only';
import type postgres from 'postgres';
import { comoAlumno } from '@/lib/db.server';
import { programasDelAlumno } from './inscripcion';
import type {
  CursoResumen,
  ModuloCatalogo,
  ProgramaCatalogo,
} from './cursos-contrato';

type Sql = ReturnType<typeof postgres>;

/**
 * Lectura de Mis cursos y del Catálogo (Explorar). Corre con RLS vía `comoAlumno`:
 * el alumno lee los programas publicados (programas_read · true) y solo SU progreso
 * (reproduccion_progreso · alumno = auth.uid()). Sin lógica de dominio (§2). Ver
 * `cursos-contrato` para el reparto REAL vs PENDIENTE (inscripción/checkout).
 */

type FilaPrograma = {
  id: string;
  nombre: string;
  descripcion: string | null;
  modulos: number;
  lecciones: number;
  contenidos: number;
  horas: number;
};

/** Agregados por programa publicado (subqueries para no doble-contar en joins). */
async function programasPublicados(
  sql: Sql,
): Promise<FilaPrograma[]> {
  return sql<FilaPrograma[]>`
    select
      pr.id,
      pr.nombre,
      pr.descripcion,
      (select count(*) from lxp.modulos m where m.programa_id = pr.id)::int as modulos,
      (select coalesce(sum(m.horas), 0) from lxp.modulos m where m.programa_id = pr.id)::float8 as horas,
      (select count(*) from lxp.lecciones l
         join lxp.modulos m on m.id = l.modulo_id
         where m.programa_id = pr.id)::int as lecciones,
      (select count(*) from lxp.contenidos co
         join lxp.lecciones l on l.id = co.leccion_id
         join lxp.modulos m on m.id = l.modulo_id
         where m.programa_id = pr.id)::int as contenidos
    from lxp.programas pr
    where pr.publicado
    order by pr.nombre`;
}

/** Contenidos completados por programa (reproduccion_progreso del alumno). */
async function completadosPorPrograma(
  sql: Sql,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await sql<{ programa_id: string; completados: number }[]>`
    select m.programa_id, count(*) filter (where rp.completado)::int as completados
    from lxp.reproduccion_progreso rp
    join lxp.contenidos co on co.id = rp.contenido_id
    join lxp.lecciones l on l.id = co.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where rp.alumno_id = ${userId}
    group by m.programa_id`;
  return new Map(rows.map((r) => [r.programa_id, r.completados]));
}

/** Primera lección de cada programa (para "Continuar"), por orden de módulo/lección. */
async function primeraLeccionPorPrograma(
  sql: Sql,
): Promise<Map<string, { leccionId: string; nombre: string }>> {
  const rows = await sql<
    { programa_id: string; leccion_id: string; nombre: string }[]
  >`
    select distinct on (m.programa_id)
      m.programa_id, l.id as leccion_id, l.nombre
    from lxp.modulos m
    join lxp.lecciones l on l.modulo_id = m.id
    join lxp.programas pr on pr.id = m.programa_id
    where pr.publicado
    order by m.programa_id, m.orden, l.orden`;
  return new Map(
    rows.map((r) => [r.programa_id, { leccionId: r.leccion_id, nombre: r.nombre }]),
  );
}

/**
 * Mis cursos: programas en los que el alumno está INSCRITO (vía su grupo · inscripción
 * CORA, §10). Fallback de resiliencia: si el alumno aún no tiene ninguna inscripción
 * mapeada (usuario en transición), devuelve el catálogo publicado para poder arrancar
 * y no dejar una pantalla vacía (documentado en el contrato · Sprint 11 endurece).
 */
export async function getMisCursos(userId: string): Promise<CursoResumen[]> {
  return comoAlumno(userId, async (sql) => {
    const [programas, inscritos, completados, primeras] = await Promise.all([
      programasPublicados(sql),
      programasDelAlumno(sql, userId),
      completadosPorPrograma(sql, userId),
      primeraLeccionPorPrograma(sql),
    ]);

    const mios = inscritos.size > 0
      ? programas.filter((p) => inscritos.has(p.id))
      : programas;

    return mios.map((p): CursoResumen => {
      const hechos = completados.get(p.id) ?? 0;
      return {
        programaId: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        modulos: p.modulos,
        lecciones: p.lecciones,
        contenidos: p.contenidos,
        horas: p.horas,
        completados: hechos,
        avancePct: p.contenidos > 0 ? Math.round((100 * hechos) / p.contenidos) : 0,
        continuar: primeras.get(p.id) ?? null,
      };
    });
  });
}

/**
 * Catálogo (Explorar): todos los programas publicados con su desglose de módulos
 * (upsell modular). Marca `inscrito` los que el alumno ya cursa (inscripción real · §10).
 */
export async function getCatalogo(userId: string): Promise<ProgramaCatalogo[]> {
  return comoAlumno(userId, async (sql) => {
    const [programas, inscritos, modulos] = await Promise.all([
      programasPublicados(sql),
      programasDelAlumno(sql, userId),
      sql<
        {
          programa_id: string;
          id: string;
          nombre: string;
          orden: number;
          horas: number;
          lecciones: number;
        }[]
      >`
        select
          m.programa_id, m.id, m.nombre, m.orden, m.horas::float8 as horas,
          (select count(*) from lxp.lecciones l where l.modulo_id = m.id)::int as lecciones
        from lxp.modulos m
        join lxp.programas pr on pr.id = m.programa_id
        where pr.publicado
        order by m.programa_id, m.orden`,
    ]);

    const modsPorPrograma = new Map<string, ModuloCatalogo[]>();
    for (const m of modulos) {
      const lista = modsPorPrograma.get(m.programa_id) ?? [];
      lista.push({
        id: m.id,
        nombre: m.nombre,
        orden: m.orden,
        horas: m.horas,
        lecciones: m.lecciones,
      });
      modsPorPrograma.set(m.programa_id, lista);
    }

    return programas.map((p): ProgramaCatalogo => ({
      programaId: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      horas: p.horas,
      lecciones: p.lecciones,
      modulosLista: modsPorPrograma.get(p.id) ?? [],
      inscrito: inscritos.has(p.id),
    }));
  });
}
