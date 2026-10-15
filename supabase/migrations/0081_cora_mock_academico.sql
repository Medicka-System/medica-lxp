-- ═══════════════════════════════════════════════════════════════════════════
-- 0081 · [SOLO_LOCAL] CORA MOCK — tablas ACADÉMICAS (bc_programas + grupos.programa_id)
-- Campus Virtual LXP · Médica Capacitación
--
-- El mock original (0009_cora_mock) solo espejó usuarios/estudiantes/grupos/
-- grupo_alumnos/pagos. El PUENTE 1 (0082) necesita además el CATÁLOGO de programas
-- de CORA y el vínculo grupo→programa, verificados por introspección read-only de la
-- CORA real (2026-10-15):
--   • public.bc_programas(id uuid PK, identificador text UNIQUE, nombre_programa, activo…)
--   • public.grupos.programa_id → bc_programas.id  (POR VALOR; en CORA real es NOT NULL)
--
-- Este archivo da esas MISMAS formas en LOCAL para que las funciones de 0082 (que
-- corren en ambos destinos) validen y corran idénticas aquí y contra la CORA real.
--
-- ⚠️ SOLO_LOCAL (§10): en PRODUCCIÓN el runner lo OMITE (MIGRATION_TARGET=supabase) —
--    `public.bc_programas` y `public.grupos.programa_id` YA existen y son de CORA; el
--    LXP jamás crea/altera `public` (reglas 1-3). Registrado en SOLO_LOCAL (migrate.ts).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── public.bc_programas — catálogo de programas de CORA (subconjunto académico) ──
-- La CORA real tiene 28 columnas (muchas comerciales/financieras); aquí solo las que
-- el puente lee. `identificador` es UNIQUE (slug estable), igual que en producción.
create table if not exists public.bc_programas (
  id               uuid primary key default gen_random_uuid(),
  identificador    text unique not null,
  nombre_programa  text not null,
  activo           boolean default true,
  creado_en        timestamptz not null default now()
);

-- ── public.grupos — columnas que el reflejo lee (en CORA real ya existen) ──
--   • programa_id → bc_programas.id (en CORA real NOT NULL; nullable aquí para no
--     romper inserts previos del seed; el seed lo puebla para los grupos demo).
--   • modalidad (online|presencial|hibrida), fecha_inicio, fecha_fin — las usa
--     lxp.reflejar_grupos_cora (0082) para materializar lxp.grupos.
alter table public.grupos add column if not exists programa_id uuid;
alter table public.grupos add column if not exists modalidad text;
alter table public.grupos add column if not exists fecha_inicio date;
alter table public.grupos add column if not exists fecha_fin date;

-- RLS como el resto del mock de CORA (todas las tablas de public la tienen · hallazgo §10).
alter table public.bc_programas enable row level security;
-- Catálogo legible por usuarios autenticados de CORA (representativo).
drop policy if exists bc_programas_read on public.bc_programas;
create policy bc_programas_read on public.bc_programas
  for select using (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual · solo local):
--   drop table if exists public.bc_programas;
--   alter table public.grupos drop column if exists programa_id;
-- ═══════════════════════════════════════════════════════════════════════════
