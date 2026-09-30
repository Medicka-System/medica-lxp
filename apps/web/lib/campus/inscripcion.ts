import 'server-only';
import type postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Inscripción REAL al GRUPO (§1/§6/§10). Fuente única de verdad para resolver la
 * cohorte del alumno en el LXP.
 *
 * La membresía la POSEE CORA (`public.inscripciones` → `public.grupos`); el LXP SOLO
 * la LEE vía la función puente `lxp.cora_grupos_de` (SECURITY DEFINER, solo lectura ·
 * §10, regla 4) unida a `lxp.grupos` por el vínculo POR VALOR `cora_grupo_id` (mig
 * 0036). El LXP jamás escribe membresía en `public`.
 *
 * Corre bajo RLS (`comoAlumno`): el `sql` recibido ya autentica como el alumno, así
 * que `cora_grupos_de` resuelve SUS grupos. En el Sprint 11 solo cambia la fuente (CORA
 * real en vez del mock/seed) — estas queries quedan idénticas.
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Grupo LXP del alumno en un programa dado (su cohorte real). `null` si el alumno no
 * está inscrito a ningún grupo de ese programa (p. ej. usuario aún sin mapear).
 * Si por datos hubiera más de uno, toma el más antiguo (determinista).
 */
export async function grupoDelAlumnoEnPrograma(
  sql: Sql,
  userId: string,
  programaId: string,
): Promise<{ id: string; nombre: string; modalidad: string | null } | null> {
  const filas = await sql<{ id: string; nombre: string; modalidad: string | null }[]>`
    select g.id, g.nombre, g.modalidad::text as modalidad
    from lxp.grupos g
    join lxp.cora_grupos_de(${userId}) cg on cg.grupo_id = g.cora_grupo_id
    where g.programa_id = ${programaId}
    order by g.created_at
    limit 1`;
  return filas[0] ?? null;
}

/**
 * Ids de los programas en los que el alumno está inscrito (vía sus grupos LXP).
 * Reemplaza la vieja "heurística de actividad": ahora es la inscripción real.
 */
export async function programasDelAlumno(
  sql: Sql,
  userId: string,
): Promise<Set<string>> {
  const rows = await sql<{ programa_id: string }[]>`
    select distinct g.programa_id
    from lxp.grupos g
    join lxp.cora_grupos_de(${userId}) cg on cg.grupo_id = g.cora_grupo_id`;
  return new Set(rows.map((r) => r.programa_id));
}

/**
 * Cohorte del alumno POR PROGRAMA (para pintar "Mis cursos" con su grupo). Un alumno
 * normalmente tiene un grupo por programa; si hubiera más, el consumidor toma el 1.º.
 */
export async function gruposDelAlumno(
  sql: Sql,
  userId: string,
): Promise<{ programaId: string; grupoId: string; grupoNombre: string; imagenPortada: string | null }[]> {
  const rows = await sql<
    { programa_id: string; grupo_id: string; grupo_nombre: string; imagen_portada: string | null }[]
  >`
    select g.programa_id, g.id as grupo_id, g.nombre as grupo_nombre, g.imagen_portada
    from lxp.grupos g
    join lxp.cora_grupos_de(${userId}) cg on cg.grupo_id = g.cora_grupo_id
    order by g.created_at`;
  return rows.map((r) => ({
    programaId: r.programa_id,
    grupoId: r.grupo_id,
    grupoNombre: r.grupo_nombre,
    imagenPortada: r.imagen_portada,
  }));
}
