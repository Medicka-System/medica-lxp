-- ═══════════════════════════════════════════════════════════════════════════
-- 0000 · [SOLO_LOCAL] Capa de compatibilidad `auth` — SHIM LOCAL
-- Campus Virtual LXP · Médica Capacitación
--
-- En Supabase el esquema `auth`, la tabla `auth.users`, las funciones
-- auth.uid()/auth.role()/auth.jwt() y los roles de plataforma
-- (anon/authenticated/service_role) YA EXISTEN — los provee la plataforma. Aquí,
-- sobre el Postgres desnudo del docker-compose, los EMULAMOS para que las MISMAS
-- policies RLS funcionen igual en local y en producción (§10, regla 1: el LXP solo
-- lee/autentica contra `auth.users`, nunca lo crea desde la app).
--
-- ⚠️ Este archivo NO se aplica contra Supabase: el runner lo OMITE cuando
--    MIGRATION_TARGET != local (SOLO_LOCAL en packages/db/src/migrate.ts). En la BD
--    compartida, `create or replace function auth.uid()` fallaría de todos modos:
--    esas funciones las posee `supabase_auth_admin`, no el rol de migración (§10).
--
-- Se ejecuta ANTES de 0001 (por el orden alfabético del runner) para que
-- `auth.users` y los roles existan cuando 0001 crea `lxp.perfiles` (FK a
-- auth.users) y concede a anon/authenticated/service_role. Todo idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Esquema auth (en Supabase ya existe) ──
create schema if not exists auth;

-- ── Roles de plataforma de Supabase (anon / authenticated / service_role) ──
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

-- ── Tabla de identidad compartida (mínimo espejo de Supabase auth.users) ──
create table if not exists auth.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text unique,
  raw_user_meta_data   jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- ── Helpers de sesión, idénticos en firma a los de Supabase: leen los claims del
-- JWT desde la GUC `request.jwt.claims` (lo que Supabase inyecta por request) ──
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
