-- ═══════════════════════════════════════════════════════════════════════════
-- 0055 · Ateneo — stats de perfil (contadores reales) + roster de "Mi grupo" (§1/§10)
--
-- Bajo RLS un alumno NO ve las conexiones ajenas (conexiones_select solo si lo involucra)
-- ni la bitácora ajena (bitacora_select solo propia), así que contar colegas/casos/aportes
-- de OTRO perfil devolvía 0. Estos contadores son stats SOCIALES PÚBLICOS del Ateneo →
-- función SECURITY DEFINER (patrón nombre_de / contactos_consulta_*), expone solo agregados:
--   · colegas = conexiones 'colegas' que involucran al perfil.
--   · casos   = casos PRESENTADOS al Ateneo (posts tipo 'caso' del perfil).
--   · aportes = sus posts + comentarios en el Ateneo.
--
-- Y el feed "Mi grupo": el roster CORA (cora_alumnos_de_grupo) es STAFF-only, así que el
-- alumno no puede listarlo. `ateneo_mi_grupo_roster` devuelve los compañeros de los grupos
-- CORA donde YO (auth.uid()) estoy inscrito — acotado a mí, no expone rosters ajenos.
-- Solo esquema `lxp`; lee `public` (CORA) solo dentro de la función SECURITY DEFINER (§10).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.ateneo_perfil_stats(p_user uuid)
returns table (colegas int, casos int, aportes int)
language sql stable security definer set search_path = lxp, public as $$
  select
    (select count(*)::int from lxp.conexiones_ateneo cx
       where cx.estado = 'colegas' and (cx.solicitante_id = p_user or cx.receptor_id = p_user)),
    (select count(*)::int from lxp.posts_ateneo p
       where p.autor_id = p_user and p.tipo = 'caso'),
    (select count(*)::int from lxp.posts_ateneo p where p.autor_id = p_user)
      + (select count(*)::int from lxp.comentarios_ateneo c where c.autor_id = p_user);
$$;

-- Compañeros de MI grupo (feed "Mi grupo"): alumnos inscritos en los grupos CORA donde
-- YO estoy inscrito. Incluye a auth.uid(). Acotado al llamador (no expone rosters ajenos).
create or replace function lxp.ateneo_mi_grupo_roster()
returns setof uuid
language sql stable security definer set search_path = lxp, public as $$
  select distinct i2.supabase_auth_id
  from public.inscripciones i1
  join public.inscripciones i2 on i2.grupo_id = i1.grupo_id
  where i1.supabase_auth_id = auth.uid();
$$;

grant execute on function lxp.ateneo_perfil_stats(uuid), lxp.ateneo_mi_grupo_roster()
  to authenticated, service_role;
