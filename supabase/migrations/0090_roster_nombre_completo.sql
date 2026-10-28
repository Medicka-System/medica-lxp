-- ═══════════════════════════════════════════════════════════════════════════
-- 0090 · Roster del grupo: nombre COMPLETO (nombre + apellidos) desde CORA (§5B/§10)
-- Campus Virtual LXP · Médica Capacitación
--
-- `cora_alumnos_de_grupo` (0037) devolvía solo `estudiantes.nombre` → en el Studio el
-- alumno salía sin apellido. CORA guarda el apellido en `public.estudiantes.apellidos`
-- (columna aparte). Aquí se concatena nombre + apellidos para el `nombre` que ve el staff.
--
-- Lectura DEFENSIVA de `apellidos` vía `to_jsonb(e)->>'apellidos'`: el mock LOCAL de CORA
-- no tiene esa columna (una función SQL valida las referencias a columnas al CREARSE, así
-- que `e.apellidos` directo rompería `migrate:up` en local). `to_jsonb(e)->>'apellidos'`
-- devuelve NULL si la clave no existe → local sigue mostrando solo el nombre, prod muestra
-- el nombre completo. Sin cambiar la firma (3 columnas) → cero cambios en el tipo/loader/UI.
--
-- Solo esquema `lxp`; lee `public` en SECURITY DEFINER read-only, gated a staff. CERO DDL
-- sobre `public`/CORA (§10, regla 3/4).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.cora_alumnos_de_grupo(p_cora_grupo_id uuid)
returns table (supabase_auth_id uuid, nombre text, matricula text)
language sql stable security definer set search_path = lxp, public as $$
  select e.supabase_auth_id,
         coalesce(
           nullif(trim(coalesce(e.nombre, '') || ' ' || coalesce(to_jsonb(e) ->> 'apellidos', '')), ''),
           u.nombre, u.email
         ) as nombre,
         e.matricula
  from public.grupo_alumnos ga
  join public.estudiantes e on e.id = ga.estudiante_id
  left join public.usuarios u on u.supabase_auth_id = e.supabase_auth_id
  where ga.grupo_id = p_cora_grupo_id
    and lxp.es_staff();
$$;

-- `create or replace` conserva los grants de 0037; explícito por consistencia (idempotente).
grant execute on function lxp.cora_alumnos_de_grupo(uuid) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual): re-crear la versión de 0037 (solo e.nombre, sin apellidos).
-- ═══════════════════════════════════════════════════════════════════════════
