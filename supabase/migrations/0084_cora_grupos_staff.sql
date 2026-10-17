-- ═══════════════════════════════════════════════════════════════════════════
-- 0084 · CORA → Studio: TODOS los grupos de CORA para la vista de GRUPOS (read-only)
-- Campus Virtual LXP · Médica Capacitación
--
-- La vista de GRUPOS del Studio lista los grupos ESPEJO de CORA (de todos los programas
-- visibles al staff) con su programa, modalidad, fechas y conteo de alumnos. El ROSTER
-- (listado de alumnos) por grupo se trae con `lxp.cora_alumnos_de_grupo` (0037), ya
-- SECURITY DEFINER / es_staff — no se duplica aquí.
--
-- Fechas (verificado contra CORA real · 2026-10-16): `public.grupos.fecha_inicio` y
-- `fecha_fin` son `date`, POBLADAS en los 54 grupos, 0 invertidas (inicio ≤ fin) y
-- plausibles; coinciden con min/max(agenda_sesiones.fecha) y además cubren los 13 grupos
-- sin sesiones. Son la fuente autoritativa — NO se derivan de agenda_sesiones.
--
-- Read-only total sobre `public` desde el cuerpo de una función SECURITY DEFINER, gated a
-- STAFF (es_staff evalúa auth.uid() del caller) — mismo patrón que 0037/0083. CERO DDL/RLS
-- sobre `public`; jamás escribe. Vínculo por valor (grupos.programa_id → bc_programas.id).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.cora_grupos_staff()
returns table (
  cora_grupo_id    uuid,
  cora_programa_id uuid,
  programa_nombre  text,
  nombre           text,
  modalidad        text,
  fecha_inicio     date,
  fecha_fin        date,
  alumnos          int
)
language sql stable security definer set search_path = lxp, public as $$
  select
    g.id,
    g.programa_id,
    bp.nombre_programa,
    g.nombre,
    g.modalidad,
    g.fecha_inicio,
    g.fecha_fin,
    (select count(*)::int from public.grupo_alumnos ga where ga.grupo_id = g.id) as alumnos
  from public.grupos g
  join public.bc_programas bp on bp.id = g.programa_id
  where lxp.es_staff()
  order by bp.nombre_programa, g.nombre;
$$;

revoke execute on function lxp.cora_grupos_staff() from public;
grant execute on function lxp.cora_grupos_staff() to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop function if exists lxp.cora_grupos_staff();
-- ═══════════════════════════════════════════════════════════════════════════
