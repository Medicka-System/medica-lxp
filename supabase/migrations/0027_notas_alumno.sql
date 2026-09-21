-- ═══════════════════════════════════════════════════════════════════════════
-- 0027 · Notas del alumno en la lección (§5A · mock leccion-lectura)
--
-- El alumno anota mientras estudia: guarda un fragmento de texto como nota, SUBRAYA
-- (tipo Kindle, anclado al rango del texto), escribe notas libres y marca MOMENTOS
-- del video (timestamp). Todas privadas: solo su autor las ve/edita (RLS).
--
-- CRUD directo web→Supabase bajo RLS (Regla de Oro §2 — NO pasa por NestJS): es dato
-- del alumno, no dominio. El panel de notas vive en el rail derecho de la lección.
--
-- Seed-safe / idempotente: enum en DO-block, `create table/index if not exists`,
-- `drop policy if exists` antes de crear. Solo esquema `lxp`; jamás el `public` de
-- CORA (§10, regla 3).
--
-- ⚠️ GRANT base OBLIGATORIO (lección aprendida en 0020/0021): el `grant on all` de
-- 0010 NO es retroactivo. Sin el grant de tabla, la RLS devuelve "permission denied"
-- y tumbaría las rutas del alumno con 500. Por eso se concede explícito abajo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tipo de nota ──
do $$ begin
  create type lxp.nota_tipo as enum (
    'texto_seleccionado', -- fragmento del texto guardado como nota (cita)
    'nota_libre',         -- nota escrita por el alumno en el composer
    'subrayado',          -- resaltado anclado a un rango del texto (persistente)
    'marcador_video'      -- momento del video (timestamp) para volver al punto
  );
exception when duplicate_object then null; end $$;

-- ── notas ──
create table if not exists lxp.notas (
  id           uuid primary key default gen_random_uuid(),
  alumno_id    uuid not null references lxp.perfiles(user_id) on delete cascade,
  leccion_id   uuid not null references lxp.lecciones(id) on delete cascade,
  -- Denormalizado para agrupar por módulo en el panel (nullable · se llena al crear).
  modulo_id    uuid references lxp.modulos(id) on delete set null,
  tipo         lxp.nota_tipo not null,
  -- Texto de la nota: la cita, la nota libre, el texto subrayado o el rótulo del marcador.
  contenido    text not null default '',
  -- Ancla flexible según tipo:
  --   · subrayado / texto_seleccionado → { "bloqueId": text, "inicio": int, "fin": int, "texto": text }
  --   · marcador_video                 → { "segundos": number }
  --   · nota_libre                     → {}  (o { "segundos": number } si se ancló a un punto)
  ancla        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists notas_alumno_leccion_idx on lxp.notas (alumno_id, leccion_id);

drop trigger if exists notas_touch on lxp.notas;
create trigger notas_touch
  before update on lxp.notas
  for each row execute function lxp.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS + grants — el alumno gestiona SOLO sus notas (privadas, sin staff)
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.notas enable row level security;

drop policy if exists notas_select on lxp.notas;
create policy notas_select on lxp.notas
  for select to authenticated
  using (alumno_id = auth.uid());

drop policy if exists notas_insert on lxp.notas;
create policy notas_insert on lxp.notas
  for insert to authenticated
  with check (alumno_id = auth.uid());

drop policy if exists notas_update on lxp.notas;
create policy notas_update on lxp.notas
  for update to authenticated
  using (alumno_id = auth.uid())
  with check (alumno_id = auth.uid());

drop policy if exists notas_delete on lxp.notas;
create policy notas_delete on lxp.notas
  for delete to authenticated
  using (alumno_id = auth.uid());

-- Grant base (NO retroactivo · fallo de 0020 corregido en 0021). Sin esto → 500.
grant select, insert, update, delete on lxp.notas to authenticated;
grant all on lxp.notas to service_role;
