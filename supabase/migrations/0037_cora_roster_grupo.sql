-- ═══════════════════════════════════════════════════════════════════════════
-- 0037 · Puente CORA→LXP: roster del grupo para el Studio (§5B/§6/§10)
--
-- El Studio (docente/admin) necesita LISTAR los alumnos de un grupo y su avance.
-- La inscripción vive en CORA (`public.inscripciones` → `public.grupos`); el LXP la
-- LEE, nunca la escribe (§10, regla 4). El Studio corre bajo RLS con rol
-- `authenticated` (comoStaff), así que NO puede leer `public.*` directo — igual que
-- el alumno. Por eso se lee vía estas funciones SECURITY DEFINER (mismo patrón que
-- `cora_grupos_de`/`cora_usuario` de 0009), acotadas a STAFF: un no-staff no obtiene
-- filas (no se filtra el roster de una cohorte a los alumnos).
--
-- El AVANCE por alumno NO necesita puente: `reproduccion_progreso_select` (0017) ya
-- deja al staff leer el progreso de todos bajo RLS. Aquí solo el roster (nombres).
--
-- Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3). En el Sprint 11 solo
-- cambia la FUENTE (CORA real); la firma de estas funciones no cambia.
-- ═══════════════════════════════════════════════════════════════════════════

-- Alumnos inscritos a un grupo de CORA (por su id, = lxp.grupos.cora_grupo_id).
-- Devuelve filas SOLO si el llamador es staff (es_staff evalúa auth.uid() del caller).
create or replace function lxp.cora_alumnos_de_grupo(p_cora_grupo_id uuid)
returns table (supabase_auth_id uuid, nombre text, matricula text)
language sql stable security definer set search_path = lxp, public as $$
  select i.supabase_auth_id,
         coalesce(e.nombre, u.nombre, u.email) as nombre,
         e.matricula
  from public.inscripciones i
  left join public.estudiantes e on e.supabase_auth_id = i.supabase_auth_id
  left join public.usuarios    u on u.supabase_auth_id = i.supabase_auth_id
  where i.grupo_id = p_cora_grupo_id
    and lxp.es_staff();
$$;

-- Conteo de alumnos por grupo CORA (para la lista de grupos, una sola query).
-- También acotado a staff.
create or replace function lxp.cora_conteo_alumnos()
returns table (cora_grupo_id uuid, alumnos int)
language sql stable security definer set search_path = lxp, public as $$
  select i.grupo_id, count(*)::int
  from public.inscripciones i
  where lxp.es_staff()
  group by i.grupo_id;
$$;

grant execute on function lxp.cora_alumnos_de_grupo(uuid), lxp.cora_conteo_alumnos()
  to authenticated, service_role;
