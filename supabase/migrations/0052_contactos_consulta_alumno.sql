-- ═══════════════════════════════════════════════════════════════════════════
-- 0052 · Contactos permitidos del ALUMNO para iniciar una consulta 1:1 (§5.5/§10)
--
-- BUG: el modal "Nueva consulta" salía VACÍO. Bajo RLS el alumno solo ve su propio
-- perfil (`perfiles_select`: user_id = auth.uid() or es_staff()), así que la query
-- que armaba los contactos (docentes/staff/colegas) devolvía 0 filas.
--
-- Fix §10-correcto (mismo patrón que nombre_de / cora_alumnos_de_grupo): función
-- SECURITY DEFINER que lee perfiles/conexiones saltando RLS, ACOTADA a que el llamador
-- sea el propio alumno (o staff) — nadie sondea los contactos de otro.
--   · docentes → de los grupos donde el alumno está inscrito (CORA → lxp.grupos).
--   · staff    → admin/super_admin del campus.
--   · colegas  → conexiones del Ateneo en estado 'colegas'.
-- Solo esquema `lxp`; lee `public` (CORA) solo vía cora_grupos_de (SECURITY DEFINER).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.contactos_consulta_alumno(p_alumno uuid)
returns table (user_id uuid, nombre text, rol text, especialidad text, sede text, tipo text)
language sql stable security definer set search_path = lxp, public as $$
  with permitido as (select (p_alumno = auth.uid() or lxp.es_staff()) as ok)
  -- Docentes de los grupos del alumno (inscripción CORA → lxp.grupos → docente).
  select distinct pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'docente'::text as tipo
  from lxp.cora_grupos_de(p_alumno) cg
  join lxp.grupos g on g.cora_grupo_id = cg.grupo_id
  join lxp.perfiles pf on pf.user_id = g.docente_id
  where g.docente_id is not null and (select ok from permitido)
  union
  -- Staff del campus (control escolar / soporte).
  select pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'staff'::text
  from lxp.perfiles pf
  where pf.rol in ('admin', 'super_admin') and (select ok from permitido)
  union
  -- Colegas conectados (Ateneo · conexiones estado 'colegas').
  select pf.user_id, pf.nombre, pf.rol::text, pf.especialidad, pf.sede, 'colega'::text
  from lxp.conexiones_ateneo cx
  join lxp.perfiles pf
    on pf.user_id = (case when cx.solicitante_id = p_alumno then cx.receptor_id else cx.solicitante_id end)
  where cx.estado = 'colegas'
    and (cx.solicitante_id = p_alumno or cx.receptor_id = p_alumno)
    and (select ok from permitido);
$$;

grant execute on function lxp.contactos_consulta_alumno(uuid) to authenticated, service_role;
