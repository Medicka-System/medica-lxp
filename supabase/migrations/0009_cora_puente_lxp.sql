-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 (puente) · Puente de LECTURA CORA→LXP — CORRE EN AMBOS DESTINOS (§10, r.4)
-- Campus Virtual LXP · Médica Capacitación
--
-- Funciones SECURITY DEFINER, SOLO lectura, en el esquema `lxp`. Leen `public` (CORA)
-- SIN acoplar tablas entre esquemas en policies. En LOCAL leen el mock de
-- `0009_cora_mock.sql`; en SUPABASE leen las tablas REALES de CORA (que ya existen).
-- Por eso este archivo NO es SOLO_LOCAL: se aplica también contra la BD compartida.
--
-- Reescritas al ESQUEMA REAL de CORA (introspección read-only 2026-09-30). El camino
-- de join de un usuario a su cohorte es:
--     auth.uid()  →  estudiantes.supabase_auth_id  →  estudiantes.id
--                 →  grupo_alumnos.estudiante_id   →  grupo_alumnos.grupo_id
-- `estudiantes.supabase_auth_id` es NULLABLE: un alumno del CRM sin cuenta auth no
-- machea `auth.uid()` (no-null) → sin vínculo = sin grupos = sin acceso.
--
-- CONTRATO CORA verificado (columnas 1:1 con producción):
--   • public.usuarios(supabase_auth_id, email, nombre, rol)
--   • public.estudiantes(id, supabase_auth_id, nombre, matricula, estatus)
--   • public.grupo_alumnos(grupo_id, estudiante_id, estatus)   -- NO existe `inscripciones`
--   • public.grupos(id, nombre)                                -- NO tiene `ciclo`
--   Valor "activo" de `grupo_alumnos.estatus` = 'activo' (del CHECK real de la tabla;
--   valores: activo/baja_temporal/baja_definitiva/suspendido/pendiente_practica/
--   no_aprobo/concluyo).
--
-- Se separó del mock (0009_cora_mock) porque migraciones posteriores invocan estas
-- funciones en SUS cuerpos — con `check_function_bodies` (default) fallarían al crearse
-- si el puente no existiera: 0036 (mis_grupos_lxp → cora_grupos_de) y 0052.
--
-- En producción estas funciones las poseería un rol con SELECT de solo-lectura sobre
-- las tablas concretas de CORA; en local corren como el owner de la migración.
-- ═══════════════════════════════════════════════════════════════════════════

-- Datos básicos del usuario de CORA por su auth id. (usuarios: contrato intacto.)
create or replace function lxp.cora_usuario(p_auth_id uuid)
returns table (supabase_auth_id uuid, email text, nombre text, rol text)
language sql stable security definer set search_path = lxp, public as $$
  select u.supabase_auth_id, u.email, u.nombre, u.rol
  from public.usuarios u
  where u.supabase_auth_id = p_auth_id;
$$;

-- ¿El alumno tiene acceso? = tiene al menos una inscripción ACTIVA en CORA.
-- (Reemplaza el viejo "pago no vencido": `public.pagos` real es un ledger por lead_id,
-- sin bandera de acceso por alumno. El acceso por PAGO es un concepto aparte de CORA
-- por definir · §10; hoy se deriva de la inscripción activa.)
create or replace function lxp.cora_acceso_activo(p_auth_id uuid)
returns boolean
language sql stable security definer set search_path = lxp, public as $$
  select exists (
    select 1
    from public.estudiantes e
    join public.grupo_alumnos ga on ga.estudiante_id = e.id
    where e.supabase_auth_id = p_auth_id
      and ga.estatus = 'activo'
  );
$$;

-- Grupos de CORA en los que está inscrito el alumno. `ciclo` se conserva en la firma
-- (para no tocar la app) pero CORA no lo tiene → NULL.
create or replace function lxp.cora_grupos_de(p_auth_id uuid)
returns table (grupo_id uuid, nombre text, ciclo text)
language sql stable security definer set search_path = lxp, public as $$
  select g.id, g.nombre, null::text as ciclo
  from public.estudiantes e
  join public.grupo_alumnos ga on ga.estudiante_id = e.id
  join public.grupos g on g.id = ga.grupo_id
  where e.supabase_auth_id = p_auth_id;
$$;

grant execute on function
  lxp.cora_usuario(uuid), lxp.cora_acceso_activo(uuid), lxp.cora_grupos_de(uuid)
to anon, authenticated, service_role;
