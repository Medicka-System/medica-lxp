-- ═══════════════════════════════════════════════════════════════════════════
-- 0083 · CORA → Studio: grupos + conteo de alumnos POR PROGRAMA (read-only · §10)
-- Campus Virtual LXP · Médica Capacitación
--
-- El Studio separa dos ORÍGENES de programas: NATIVOS del LXP (sin vínculo CORA) y
-- el espejo "CORA" (TODOS los programas de CORA, vía lxp.cora_programas_catalogo · 0082).
-- Para cada programa CORA, el diseñador ve SUS grupos ya vinculados (los de CORA) con
-- su conteo de alumnos — SIN vincular ni crear nada a mano.
--
-- Esta función LEE public.grupos + public.grupo_alumnos (CORA) en SOLO LECTURA desde el
-- cuerpo de una función SECURITY DEFINER, acotada a STAFF (es_staff evalúa auth.uid() del
-- caller) — mismo patrón que cora_conteo_alumnos / cora_alumnos_de_grupo (0037). El web ya
-- gatea la pantalla con requireAutoria; esto es el segundo candado.
--
-- §10: SOLO esquema `lxp`. CERO DDL/RLS sobre `public`; jamás escribe en `public`/`auth`.
-- `grupos.programa_id` referencia a bc_programas.id POR VALOR (no FK cross-schema · 0082).
-- ═══════════════════════════════════════════════════════════════════════════

-- Grupos de un programa de CORA (por su bc_programas.id) + nº de alumnos inscritos.
-- Mismo conteo que cora_conteo_alumnos (todas las filas de grupo_alumnos del grupo).
-- Incluye grupos con 0 alumnos (subconsulta, no inner join). Devuelve filas SOLO a staff.
create or replace function lxp.cora_grupos_de_programa(p_cora_programa_id uuid)
returns table (
  cora_grupo_id uuid,
  nombre        text,
  modalidad     text,
  fecha_inicio  date,
  fecha_fin     date,
  alumnos       int
)
language sql stable security definer set search_path = lxp, public as $$
  select
    g.id,
    g.nombre,
    g.modalidad,
    g.fecha_inicio,
    g.fecha_fin,
    (select count(*)::int from public.grupo_alumnos ga where ga.grupo_id = g.id) as alumnos
  from public.grupos g
  where g.programa_id = p_cora_programa_id
    and lxp.es_staff()
  order by g.nombre;
$$;

-- Mínimo privilegio (patrón 0065): sin anon/public; lo consume el Studio (autoría/staff).
revoke execute on function lxp.cora_grupos_de_programa(uuid) from public;
grant execute on function lxp.cora_grupos_de_programa(uuid) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop function if exists lxp.cora_grupos_de_programa(uuid);
-- ═══════════════════════════════════════════════════════════════════════════
