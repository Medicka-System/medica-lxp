-- ═══════════════════════════════════════════════════════════════════════════
-- 0059 · Lecturas cross-user del Campus (perfil público + roster del propio alumno) · §10
--
-- Cierra el atajo del Bloque 4: `privacidadDe`/`privacidadDeVarios` (db.server.ts) leían
-- `preferencias->'privacidad'` de OTROS perfiles con la conexión OWNER (bypass de RLS),
-- porque `perfiles_select` (own-or-staff) oculta el perfil ajeno. Se reemplaza por una
-- función SECURITY DEFINER de solo-lectura que expone SOLO los campos públicos del perfil
-- y RESPETA el flag `perfilVisible` (no filtra nombre/avatar/portada de un perfil oculto).
--
--   • perfil_publico_de(ids): para cada id existente devuelve id, rol y los flags de
--     privacidad (perfil_visible/acepta_colegas, con los DEFAULT del Bloque 4 cuando aún no
--     hay preferencias). nombre/avatar_url/portada_url SOLO si perfil_visible; si el perfil
--     está oculto se devuelven NULL (respeta perfilVisible · no expone el perfil). Sirve a
--     los gates de privacidad Y a la lectura de avatares/nombres del Ateneo (Ola 2).
--   • roster_grupo_alumno(): compañeros de los grupos CORA donde YO (auth.uid()) estoy
--     inscrito (id, nombre, avatar_url), incluido el propio alumno. `cora_alumnos_de_grupo`
--     (0037) es STAFF-only; esta acota al llamador y permite a un alumno ver a sus
--     compañeros (E1) sin exponer rosters ajenos.
--
-- Patrón nombre_de/ateneo_perfil_stats/cora_alumnos_de_grupo (§10, regla 4): solo esquema
-- `lxp`; lee `public` (CORA) SOLO dentro de la función SECURITY DEFINER. Aditiva.
-- ═══════════════════════════════════════════════════════════════════════════

-- Perfil público de N usuarios (respeta perfilVisible). READ-ONLY, solo campos públicos.
create or replace function lxp.perfil_publico_de(p_user_ids uuid[])
returns table (
  id             uuid,
  nombre         text,
  avatar_url     text,
  portada_url    text,
  perfil_visible boolean,
  acepta_colegas boolean,
  rol            text
)
language sql stable security definer set search_path = lxp, public as $$
  select
    p.user_id                                              as id,
    case when v.perfil_visible then p.nombre      end      as nombre,
    case when v.perfil_visible then p.avatar_url  end      as avatar_url,
    case when v.perfil_visible then p.portada_url end      as portada_url,
    v.perfil_visible,
    v.acepta_colegas,
    p.rol::text                                            as rol
  from lxp.perfiles p
  cross join lateral (
    select
      coalesce((p.preferencias #>> '{privacidad,perfilVisible}')::boolean,  true) as perfil_visible,
      coalesce((p.preferencias #>> '{privacidad,aceptarColegas}')::boolean, true) as acepta_colegas
  ) v
  where p.user_id = any(p_user_ids);
$$;

-- Compañeros de MI grupo (E1): alumnos inscritos en los grupos CORA donde YO estoy
-- inscrito. Acotado a auth.uid() (no expone rosters ajenos). Incluye al propio alumno.
create or replace function lxp.roster_grupo_alumno()
returns table (id uuid, nombre text, avatar_url text)
language sql stable security definer set search_path = lxp, public as $$
  -- Esquema real: inscripción = public.grupo_alumnos (enlace por estudiante_id →
  -- estudiantes.id). Se recorre estudiantes en ambos extremos para llegar al auth id.
  select distinct p.user_id as id, p.nombre, p.avatar_url
  from public.estudiantes e1
  join public.grupo_alumnos ga1 on ga1.estudiante_id = e1.id
  join public.grupo_alumnos ga2 on ga2.grupo_id = ga1.grupo_id
  join public.estudiantes e2 on e2.id = ga2.estudiante_id
  join lxp.perfiles p on p.user_id = e2.supabase_auth_id
  where e1.supabase_auth_id = auth.uid();
$$;

grant execute on function lxp.perfil_publico_de(uuid[]), lxp.roster_grupo_alumno()
  to authenticated, service_role;
