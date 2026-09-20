-- ═══════════════════════════════════════════════════════════════════════════
-- 0025 · Ficha completa del caso (§6 · captura + edición del caso DICOM)
--
-- El uploader y la vista de detalle capturan/editan la ficha completa del caso
-- (fiel a los mocks de bitácora/editor/biblioteca): además de órgano y dominio
-- I-AIM (ya existentes), la patología, la técnica, el equipo, las etiquetas
-- (#hashtags), la viñeta clínica y —en la bitácora— el docente asignado a validar.
--
-- Mismo conjunto en `bitacora_casos` (caso del alumno) y `casos_biblioteca` (banco
-- curado) para que la ficha sea transversal. `casos_biblioteca` ya tiene su docente
-- vía `curador_id`; el `docente_id` (a validar) es propio de la bitácora.
--
-- Seed-safe: todo es `add column if not exists` con default; no requiere datos.
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Caso del alumno (bitácora) ──
alter table lxp.bitacora_casos
  add column if not exists patologia   text,
  add column if not exists tecnica     text,
  add column if not exists equipo      text,
  add column if not exists vineta      text,
  -- Etiquetas / #hashtags del caso (arreglo de strings).
  add column if not exists etiquetas   jsonb not null default '[]'::jsonb,
  -- Docente asignado a validar el caso (§5B). null = sin asignar (lo toma cualquiera
  -- de sus grupos). on delete set null: si el docente se va, el caso no se borra.
  add column if not exists docente_id  uuid references lxp.perfiles(user_id) on delete set null;

comment on column lxp.bitacora_casos.etiquetas is
  'Etiquetas/#hashtags del caso (arreglo de strings), para búsqueda y catalogación.';
comment on column lxp.bitacora_casos.docente_id is
  'Docente asignado a validar el caso (§5B). null = sin asignar.';

create index if not exists bitacora_docente_idx on lxp.bitacora_casos (docente_id);

-- ── Banco curado (casos_biblioteca) — misma ficha para el editor del staff ──
alter table lxp.casos_biblioteca
  add column if not exists patologia   text,
  add column if not exists tecnica     text,
  add column if not exists equipo      text,
  add column if not exists vineta      text,
  add column if not exists etiquetas   jsonb not null default '[]'::jsonb;

comment on column lxp.casos_biblioteca.etiquetas is
  'Etiquetas/#hashtags del caso curado (arreglo de strings).';

-- ── Docentes disponibles para asignar la validación (§5B) ──
-- La RLS de `lxp.perfiles` restringe SELECT a "el propio + staff", pero el alumno
-- necesita elegir a QUÉ docente enviar su caso a validar. Igual que `nombre_de`
-- (0011), exponemos SOLO id + nombre de los docentes por una función SECURITY
-- DEFINER de solo-lectura. Nada sensible se filtra.
create or replace function lxp.docentes_disponibles()
returns table (user_id uuid, nombre text)
language sql stable security definer set search_path = lxp, public as $$
  select user_id, nombre from lxp.perfiles where rol = 'docente' order by nombre;
$$;

grant execute on function lxp.docentes_disponibles() to authenticated, service_role;
