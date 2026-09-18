-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 · CORA MOCK (esquema `public`) — SOLO LOCAL (§10 / SPRINTS §1)
--
-- Replica la ESTRUCTURA REAL de CORA en `public.*` con los MISMOS nombres que
-- producción (usuarios/estudiantes/grupos/pagos), para que el código del LXP use
-- idénticas queries en local y en el Sprint 11 (integración real) — sin reescribir.
--
-- Reproduce fielmente los HALLAZGOS de la auditoría (§10):
--   • trigger `on_auth_user_created` → `sync_auth_user_to_usuarios()` que INSERTA
--     en public.usuarios; si el metadata no trae `rol`, DEFAULT 'control_escolar'.
--   • CHECK cerrado en public.usuarios.rol (6 valores; rechaza roles del LXP).
--   • RLS habilitada en TODAS las tablas de public.
--
-- ⚠️ En PRODUCCIÓN este archivo NO se ejecuta: `public` ya existe y es de CORA.
--    El LXP jamás crea/altera `public` (§10, reglas 1-3). Este mock existe solo
--    para PROBAR la convivencia en local.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── public.usuarios — idéntico al de CORA (CHECK + DEFAULT verificados) ──
create table if not exists public.usuarios (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid unique references auth.users(id) on delete cascade,
  email             text,
  nombre            text,
  rol               text not null default 'control_escolar'
                      check (rol in ('super_admin','admin','control_escolar',
                                     'docente','alumno','asesor')),
  created_at        timestamptz not null default now()
);

create table if not exists public.estudiantes (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid references auth.users(id) on delete cascade,
  matricula         text unique,
  nombre            text,
  created_at        timestamptz not null default now()
);

create table if not exists public.grupos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  ciclo             text,
  created_at        timestamptz not null default now()
);

-- Inscripción alumno↔grupo (vive en CORA, el LXP la LEE · §6).
create table if not exists public.inscripciones (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid references auth.users(id) on delete cascade,
  grupo_id          uuid references public.grupos(id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (supabase_auth_id, grupo_id)
);

create table if not exists public.pagos (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid references auth.users(id) on delete cascade,
  estado            text not null default 'al_corriente',  -- al_corriente | vencido
  vence_el          date,
  created_at        timestamptz not null default now()
);

-- ── Trigger simulado de CORA (§10, hallazgo verificado) ──
-- Cualquier INSERT en auth.users crea una fila en public.usuarios. Por eso el LXP
-- NUNCA inserta en auth.users (regla 1): lo haría CORA y quedaría fila espuria.
create or replace function public.sync_auth_user_to_usuarios()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (supabase_auth_id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', new.email),
    -- Si el metadata NO trae rol → DEFAULT administrativo de CORA.
    coalesce(new.raw_user_meta_data->>'rol', 'control_escolar')
  )
  on conflict (supabase_auth_id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_auth_user_to_usuarios();

-- ── RLS en TODAS las tablas de public (como en CORA real · hallazgo) ──
-- El LXP NO recibe grants sobre public.* → no puede leer/escribir directo. Solo
-- accede vía las funciones puente de abajo (regla 4). Estas policies representan
-- las de CORA y deben quedar INTACTAS tras las migraciones del LXP (DoD).
alter table public.usuarios      enable row level security;
alter table public.estudiantes   enable row level security;
alter table public.grupos        enable row level security;
alter table public.inscripciones enable row level security;
alter table public.pagos         enable row level security;

-- Policy representativa de CORA: cada usuario ve su propia fila (self).
create policy usuarios_self on public.usuarios
  for select using (supabase_auth_id = auth.uid());
create policy estudiantes_self on public.estudiantes
  for select using (supabase_auth_id = auth.uid());
create policy inscripciones_self on public.inscripciones
  for select using (supabase_auth_id = auth.uid());
create policy pagos_self on public.pagos
  for select using (supabase_auth_id = auth.uid());
-- grupos: legible por usuarios autenticados de CORA (representativo).
create policy grupos_read on public.grupos
  for select using (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════════════════════
-- Puente de LECTURA CORA→LXP (regla 4): funciones SECURITY DEFINER, SOLO lectura,
-- en el esquema `lxp`. Nunca se acoplan tablas de `public` en policies del LXP.
-- En producción estas funciones las poseería un rol con SELECT de solo-lectura
-- sobre las tablas concretas de CORA; en local corren como el owner de la migración.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function lxp.cora_usuario(p_auth_id uuid)
returns table (supabase_auth_id uuid, email text, nombre text, rol text)
language sql stable security definer set search_path = lxp, public as $$
  select u.supabase_auth_id, u.email, u.nombre, u.rol
  from public.usuarios u
  where u.supabase_auth_id = p_auth_id;
$$;

-- ¿El alumno tiene acceso según pagos de CORA? (sin pago vencido).
create or replace function lxp.cora_acceso_activo(p_auth_id uuid)
returns boolean
language sql stable security definer set search_path = lxp, public as $$
  select not exists (
    select 1 from public.pagos p
    where p.supabase_auth_id = p_auth_id and p.estado = 'vencido'
  );
$$;

-- Grupos de CORA en los que está inscrito el alumno.
create or replace function lxp.cora_grupos_de(p_auth_id uuid)
returns table (grupo_id uuid, nombre text, ciclo text)
language sql stable security definer set search_path = lxp, public as $$
  select g.id, g.nombre, g.ciclo
  from public.inscripciones i
  join public.grupos g on g.id = i.grupo_id
  where i.supabase_auth_id = p_auth_id;
$$;

grant execute on function
  lxp.cora_usuario(uuid), lxp.cora_acceso_activo(uuid), lxp.cora_grupos_de(uuid)
to anon, authenticated, service_role;
