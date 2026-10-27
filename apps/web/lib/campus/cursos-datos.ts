import 'server-only';
import type postgres from 'postgres';
import { comoAlumno } from '@/lib/db.server';
import { firmarDerivados } from '@/lib/media/firmar-imagenes.server';
import { gruposDelAlumno, programasDelAlumno } from './inscripcion';
import { resolverCursoAlumno } from './herencia-alumno.server';
import type {
  CursoResumen,
  CursoPendiente,
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

/**
 * Mis cursos: programas en los que el alumno está INSCRITO (vía su grupo · inscripción
 * CORA, §10). SIN fallback de catálogo — el alumno ve SOLO sus cursos reales (PUENTE 1).
 *
 * Primero corre `lxp.reflejar_grupos_cora()` (idempotente): materializa en `lxp.grupos`
 * los grupos CORA del alumno cuyo programa el diseñador ya ligó. Los grupos cuyo programa
 * aún no está ligado NO se reflejan aquí; se listan como "contenido pendiente".
 *
 * Conteos, horas y avance sobre la vista RESUELTA de herencia del grupo (§6): un módulo/
 * lección/contenido OCULTO por el grupo no cuenta. Sin overrides ⇒ igual que la plantilla.
 */
export async function getMisCursos(userId: string): Promise<CursoResumen[]> {
  return comoAlumno(userId, async (sql) => {
    // Reflejo automático de la inscripción CORA → lxp.grupos (antes de leer cohortes).
    await sql`select lxp.reflejar_grupos_cora()`;
    const grupos = await gruposDelAlumno(sql, userId);
    if (grupos.length === 0) return [];

    // Contenidos completados del alumno (cualquier programa); se intersectan con lo visible.
    const completados = new Set(
      (
        await sql<{ contenido_id: string }[]>`
          select contenido_id from lxp.reproduccion_progreso
          where alumno_id = ${userId} and completado and contenido_id is not null`
      ).map((r) => r.contenido_id),
    );
    const portadas = await firmarDerivados(grupos.map((g) => g.imagenPortada), 'portada');

    const cursos: CursoResumen[] = [];
    const vistos = new Set<string>(); // dedup por programa (un curso por programa)
    for (const g of grupos) {
      if (vistos.has(g.programaId)) continue;
      const resuelto = await resolverCursoAlumno(sql, userId, g.programaId);
      if (!resuelto) continue; // programa no publicado → no es un curso del alumno
      vistos.add(g.programaId);

      let modulos = 0;
      let lecciones = 0;
      let contenidos = 0;
      let horas = 0;
      let hechos = 0;
      let continuar: { leccionId: string; nombre: string } | null = null;
      for (const m of resuelto.vista.modulos) {
        if (m.herencia.oculto) continue;
        modulos++;
        horas += m.horas;
        // Un módulo BLOQUEADO por fecha describe el alcance del curso (cuenta en módulos/
        // lecciones/horas) pero su contenido aún no está disponible: NO entra al avance ni
        // es destino de "Continuar" (§6 · avance sobre lo liberado).
        const bloqueado = resuelto.modulosBloqueados.has(m.id);
        for (const l of m.lecciones) {
          if (l.herencia.oculto) continue;
          lecciones++;
          if (!continuar && !bloqueado) continuar = { leccionId: l.id, nombre: l.nombre };
          if (bloqueado) continue;
          for (const c of l.contenidos) {
            if (c.herencia.oculto) continue;
            contenidos++;
            if (completados.has(c.id)) hechos++;
          }
        }
      }

      cursos.push({
        programaId: g.programaId,
        nombre: resuelto.vista.programa.nombre,
        grupo: { id: g.grupoId, nombre: g.grupoNombre },
        portadaUrl: g.imagenPortada ? (portadas[g.imagenPortada]?.url ?? null) : null,
        portadaSrcset: g.imagenPortada ? portadas[g.imagenPortada]?.srcset : undefined,
        descripcion: resuelto.vista.programa.descripcion,
        modulos,
        lecciones,
        contenidos,
        horas,
        completados: hechos,
        avancePct: contenidos > 0 ? Math.round((100 * hechos) / contenidos) : 0,
        continuar,
      });
    }
    return cursos;
  });
}

/**
 * "Contenido pendiente": grupos CORA del alumno cuyo programa el diseñador aún NO ligó
 * a contenido LXP (PUENTE 1 · mig 0082). Lee `lxp.mis_grupos_cora_pendientes()` (definer,
 * solo lectura). El alumno está inscrito, pero todavía no hay temario — se muestra como
 * pendiente, nunca como inscripción falsa ni como catálogo.
 */
export async function getCursosPendientes(userId: string): Promise<CursoPendiente[]> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<
      { cora_grupo_id: string; grupo_nombre: string; programa_nombre: string }[]
    >`select cora_grupo_id, grupo_nombre, programa_nombre from lxp.mis_grupos_cora_pendientes()`;
    return filas.map((f) => ({
      coraGrupoId: f.cora_grupo_id,
      grupoNombre: f.grupo_nombre,
      programaNombre: f.programa_nombre,
    }));
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
