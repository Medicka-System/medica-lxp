-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 · Esquema lxp, identidad compartida y roles
-- Campus Virtual LXP · Médica Capacitación — Sprint 1 (LOCAL)
--
-- Crea: extensiones, esquema `lxp`, la CAPA DE COMPATIBILIDAD auth LOCAL
-- (en Supabase real ya existe `auth`; aquí, sobre Postgres desnudo, la emulamos),
-- el enum de roles del LXP, `lxp.perfiles` y los helpers de RLS.
--
-- ⚠️ CORA (§10): este archivo NO toca el esquema `public` de CORA. La convivencia
-- (tablas mock `public.*` + trigger simulado + funciones de lectura) va en 0009.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensiones ──
create extension if not exists vector;      -- pgvector (RAG · §3)
create extension if not exists pgcrypto;    -- gen_random_uuid()

-- ── Esquema propio del LXP ──
create schema if not exists lxp;

-- ═══════════════════════════════════════════════════════════════════════════
-- CAPA DE COMPATIBILIDAD auth — SOLO LOCAL
-- En Supabase real, el esquema `auth`, la tabla `auth.users` y las funciones
-- auth.uid()/auth.role()/auth.jwt() YA EXISTEN (las provee Supabase) y este
-- bloque se saltaría por los guardas `if not exists` / `or replace`. Aquí, sobre
-- Postgres desnudo del docker-compose, las emulamos para que las MISMAS policies
-- RLS funcionen igual en local y en producción (§10, regla 1: el LXP solo lee/
-- autentica contra `auth.users`, nunca lo crea desde la app).
-- ═══════════════════════════════════════════════════════════════════════════
create schema if not exists auth;

-- Roles de plataforma de Supabase (anon / authenticated / service_role).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    -- service_role omite RLS (lo usa api/worker con service_role key · §2/§5).
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Tabla de identidad compartida (mínimo espejo de Supabase auth.users).
create table if not exists auth.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text unique,
  raw_user_meta_data   jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- Helpers de sesión, idénticos en firma a los de Supabase: leen los claims del
-- JWT desde la GUC `request.jwt.claims` (lo que Supabase inyecta por request).
create or replace function auth.jwt()
returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$$;

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', current_setting('role', true));
$$;

-- Grants que Supabase da por DEFAULT sobre el esquema auth (aquí, local, hay que
-- otorgarlos a mano): sin ellos, `authenticated`/`anon` no pueden resolver
-- auth.uid()/auth.jwt()/auth.role() al evaluar las policies → "permission denied
-- for schema auth" (42501). Solo setup del entorno auth local; no toca lxp/public.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt(), auth.role()
  to anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Utilidad común: touch de updated_at
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function lxp.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Roles del LXP (§5B / §6). Enum PROPIO del LXP — NO se guarda en CORA:
-- `public.usuarios.rol` tiene un CHECK cerrado que rechazaría valores como
-- `disenador_instruccional` (§10, regla 2). El rol de plataforma vive aquí.
-- ═══════════════════════════════════════════════════════════════════════════
create type lxp.rol as enum (
  'super_admin',
  'admin',
  'docente',
  'disenador_instruccional',
  'alumno'
);

-- ── lxp.perfiles — extiende auth.users (§6) ──
-- Se PUEBLA leyendo el vínculo existente auth.users ↔ public.usuarios (§10,
-- regla 5), nunca creando identidad. `acceso_activo` lo gobierna CORA (§1).
create table lxp.perfiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  rol            lxp.rol not null,
  nombre         text not null,
  email          text,
  avatar_url     text,
  -- Espejo del control de acceso de CORA (pago). En producción lo sincroniza
  -- CORA; el LXP solo lo OBEDECE (guard + RLS · §10).
  acceso_activo  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index perfiles_rol_idx on lxp.perfiles (rol);

create trigger perfiles_touch
  before update on lxp.perfiles
  for each row execute function lxp.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Helpers de RLS (SECURITY DEFINER para leer perfiles sin recursión de policy).
-- Se usan en TODAS las policies de §6/§10. STABLE + search_path fijo.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function lxp.rol_actual()
returns lxp.rol language sql stable security definer
set search_path = lxp, public as $$
  select rol from lxp.perfiles where user_id = auth.uid();
$$;

create or replace function lxp.es_staff()
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select lxp.rol_actual() in
    ('super_admin', 'admin', 'docente', 'disenador_instruccional');
$$;

create or replace function lxp.es_docente_o_mas()
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select lxp.rol_actual() in ('super_admin', 'admin', 'docente');
$$;

create or replace function lxp.es_autoria()
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select lxp.rol_actual() in
    ('super_admin', 'admin', 'disenador_instruccional');
$$;

create or replace function lxp.acceso_activo()
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select coalesce(
    (select acceso_activo from lxp.perfiles where user_id = auth.uid()),
    false
  );
$$;

grant execute on function
  lxp.rol_actual(), lxp.es_staff(), lxp.es_docente_o_mas(),
  lxp.es_autoria(), lxp.acceso_activo()
to anon, authenticated, service_role;
