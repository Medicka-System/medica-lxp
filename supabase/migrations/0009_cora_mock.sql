-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 · [SOLO_LOCAL] CORA MOCK (esquema `public`) — §10 / SPRINTS §1
--
-- Espeja el ESQUEMA REAL de CORA (verificado por introspección read-only el
-- 2026-09-30) en `public.*`, con los MISMOS nombres de tabla/columna que producción,
-- para que las queries del LXP corran idénticas en local y contra la CORA real — sin
-- reescribir. Ajustado al contrato real (ANTES el mock asumía tablas/columnas que NO
-- existen en CORA):
--   • La inscripción alumno↔grupo es **public.grupo_alumnos** (grupo_id, estudiante_id),
--     NO `public.inscripciones` (que no existe). Enlaza por **estudiante_id → estudiantes.id**.
--   • `public.grupos` NO tiene `ciclo`.
--   • `public.pagos` es un LEDGER por `lead_id` (tipo/monto/status), sin `supabase_auth_id`
--     ni `estado`. El LXP ya NO deriva acceso de aquí (ver 0009_cora_puente_lxp).
--   • `estudiantes.estatus` y `grupo_alumnos.estatus` tienen CHECK con los mismos 7 valores
--     reales ('activo', 'baja_temporal', 'baja_definitiva', 'suspendido',
--     'pendiente_practica', 'no_aprobo', 'concluyo'); default 'activo'.
--
-- Hallazgos de auditoría (§10) conservados:
--   • trigger `on_auth_user_created` → `sync_auth_user_to_usuarios()` que INSERTA en
--     public.usuarios; si el metadata no trae `rol`, DEFAULT 'control_escolar'.
--   • CHECK cerrado en public.usuarios.rol (6 valores; rechaza roles del LXP).
--   • RLS habilitada en TODAS las tablas de public.
--
-- ⚠️ En PRODUCCIÓN este archivo NO se ejecuta: el runner lo OMITE cuando
--    MIGRATION_TARGET != local (SOLO_LOCAL en packages/db/src/migrate.ts). `public`
--    ya existe y es de CORA; el LXP jamás crea/altera `public` (§10, reglas 1-3).
--
-- ⚠️ Los PUENTES de lectura CORA→LXP (`lxp.cora_*`) viven en `0009_cora_puente_lxp.sql`
--    (esquema `lxp`), que SÍ corre en ambos destinos. Se separaron porque 0036/0052
--    invocan `cora_grupos_de` en sus cuerpos (check_function_bodies).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── public.usuarios — staff/identidad de CORA (CHECK + DEFAULT verificados) ──
create table if not exists public.usuarios (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid unique references auth.users(id) on delete cascade,
  nombre            text not null,
  apellidos         text,
  email             text not null,
  rol               text not null default 'control_escolar'
                      check (rol in ('super_admin','admin','control_escolar',
                                     'docente','alumno','asesor')),
  activo            boolean default true,
  creado_en         timestamptz not null default now()
);

-- ── public.estudiantes — alumno de CORA. `supabase_auth_id` es NULLABLE (un alumno
--    del CRM puede no tener aún cuenta auth → sin vínculo = sin acceso al LXP). ──
create table if not exists public.estudiantes (
  id                uuid primary key default gen_random_uuid(),
  supabase_auth_id  uuid references auth.users(id) on delete set null,
  nombre            text not null,
  matricula         text unique,
  estatus           text not null default 'activo'
                      check (estatus in ('activo','baja_temporal','baja_definitiva',
                                         'suspendido','pendiente_practica','no_aprobo',
                                         'concluyo')),
  creado_en         timestamptz not null default now()
);

-- ── public.grupos — instancia de programa en CORA. SIN columna `ciclo`. ──
create table if not exists public.grupos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  estatus           text,
  creado_en         timestamptz not null default now()
);

-- ── public.grupo_alumnos — INSCRIPCIÓN alumno↔grupo (la tabla real; NO `inscripciones`).
--    Enlaza `estudiante_id → estudiantes.id` (NO por supabase_auth_id). El LXP la LEE
--    vía funciones puente (§6/§10). ──
create table if not exists public.grupo_alumnos (
  id                 uuid primary key default gen_random_uuid(),
  grupo_id           uuid not null references public.grupos(id) on delete cascade,
  estudiante_id      uuid not null references public.estudiantes(id) on delete cascade,
  fecha_inscripcion  date,
  estatus            text default 'activo'
                       check (estatus in ('activo','baja_temporal','baja_definitiva',
                                          'suspendido','pendiente_practica','no_aprobo',
                                          'concluyo')),
  notas              text,
  creado_en          timestamptz not null default now(),
  unique (grupo_id, estudiante_id)
);

-- ── public.pagos — LEDGER de pagos por `lead_id` (shape real). El LXP NO lo lee: el
--    acceso se deriva de `grupo_alumnos.estatus` (ver 0009_cora_puente_lxp). Se define
--    solo por fidelidad del mock. ──
create table if not exists public.pagos (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid,
  tipo              text,
  monto             numeric,
  metodo            text,
  status            text,
  creado_en         timestamptz not null default now()
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
-- accede vía las funciones puente (regla 4). Estas policies representan las de CORA
-- y deben quedar INTACTAS tras las migraciones del LXP (DoD · test:rls cuenta >= 5).
alter table public.usuarios      enable row level security;
alter table public.estudiantes   enable row level security;
alter table public.grupos        enable row level security;
alter table public.grupo_alumnos enable row level security;
alter table public.pagos         enable row level security;

-- Policies representativas de CORA (cada usuario ve lo suyo).
create policy usuarios_self on public.usuarios
  for select using (supabase_auth_id = auth.uid());
create policy estudiantes_self on public.estudiantes
  for select using (supabase_auth_id = auth.uid());
-- grupo_alumnos: el alumno ve sus inscripciones (vía su estudiante).
create policy grupo_alumnos_self on public.grupo_alumnos
  for select using (
    estudiante_id in (select e.id from public.estudiantes e
                      where e.supabase_auth_id = auth.uid())
  );
-- pagos: ledger interno de CORA (representativo; no se expone al alumno).
create policy pagos_interno on public.pagos
  for select using (false);
-- grupos: legible por usuarios autenticados de CORA (representativo).
create policy grupos_read on public.grupos
  for select using (auth.uid() is not null);

-- Los PUENTES de lectura CORA→LXP (`lxp.cora_*`) viven en `0009_cora_puente_lxp.sql`.
