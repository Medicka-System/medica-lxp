-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 · Esquema lxp, identidad compartida y roles
-- Campus Virtual LXP · Médica Capacitación — Sprint 1
--
-- Crea SOLO lo del LXP: extensiones, esquema `lxp`, el enum de roles del LXP,
-- `lxp.perfiles` (extiende auth.users) y los helpers de RLS. En Supabase el
-- esquema `auth` y sus funciones/roles los PROVEE la plataforma; ya no se tocan
-- aquí (§10). Este archivo corre en AMBOS destinos (local y Supabase).
--
-- ⚠️ Dependencias que deben existir ANTES (las garantiza la plataforma en Supabase,
--    y el shim SOLO_LOCAL `0000_local_auth_cora_shim.sql` en local):
--      • esquema `auth` + tabla `auth.users` (FK de lxp.perfiles),
--      • funciones auth.uid()/auth.jwt()/auth.role() (usadas por las policies),
--      • roles de plataforma anon/authenticated/service_role (destino de los GRANT).
--
-- ⚠️ CORA (§10): este archivo NO toca el esquema `public` de CORA. La convivencia
-- (tablas mock `public.*` local + puentes de lectura `lxp.cora_*`) va en 0009*.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensiones ──
create extension if not exists vector;      -- pgvector (RAG · §3)
create extension if not exists pgcrypto;    -- gen_random_uuid()

-- ── Esquema propio del LXP ──
create schema if not exists lxp;

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
