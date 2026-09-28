-- ═══════════════════════════════════════════════════════════════════════════
-- 0053 · Contactos permitidos del DOCENTE para iniciar una consulta 1:1 (§5B/§10)
--
-- El docente también inicia conversaciones (mismo modal que el alumno, sin paso de tema).
-- Bajo RLS el docente ve más perfiles (es_staff/es_docente), pero el ROSTER de alumnos
-- vive en CORA (`public.inscripciones`) — que no se lee directo (§10). Función SECURITY
-- DEFINER (patrón cora_alumnos_de_grupo), ACOTADA a que el llamador sea el propio docente:
--   · alumnos → inscritos en los grupos donde el docente es titular (CORA → lxp.grupos).
--   · staff   → admin/super_admin del campus.
--   · colegas → otros docentes (rol='docente', distinto de él).
-- Solo esquema `lxp`; lee `public` (CORA) solo dentro de esta función SECURITY DEFINER.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.contactos_consulta_docente(p_docente uuid)
returns table (user_id uuid, nombre text, rol text, especialidad text, sede text, tipo text)
language sql stable security definer set search_path = lxp, public as $$
  with permitido as (select (p_docente = auth.uid() and lxp.es_docente_o_mas()) as ok)
  -- Alumnos inscritos en los grupos donde el docente es titular (roster CORA).
  select distinct pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'alumno'::text as tipo
  from lxp.grupos g
  join public.inscripciones i on i.grupo_id = g.cora_grupo_id
  join lxp.perfiles pf on pf.user_id = i.supabase_auth_id
  where g.docente_id = p_docente and (select ok from permitido)
  union
  -- Staff del campus.
  select pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'staff'::text
  from lxp.perfiles pf
  where pf.rol in ('admin', 'super_admin') and (select ok from permitido)
  union
  -- Colegas: otros docentes.
  select pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'colega'::text
  from lxp.perfiles pf
  where pf.rol = 'docente' and pf.user_id <> p_docente and (select ok from permitido);
$$;

grant execute on function lxp.contactos_consulta_docente(uuid) to authenticated, service_role;
