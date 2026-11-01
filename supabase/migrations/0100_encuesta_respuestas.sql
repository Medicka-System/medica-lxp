-- ═══════════════════════════════════════════════════════════════════════════
-- 0100 · Respuestas de ENCUESTA del alumno (§5C)
--
-- La encuesta (lección tipo `encuesta` · 0099, o bloque de teoría) RECOGE respuestas
-- SIN calificar. Las preguntas viven en `lecciones.config` / `bloques.config` (igual que
-- autoeval); AQUÍ se guardan las RESPUESTAS del alumno: una fila por alumno × encuesta,
-- con el mapa pregunta→respuesta en jsonb. No hay nota, ni correcta, ni veredicto.
--
-- Alcance de la encuesta = (leccion_id, bloque_id):
--   · bloque_id NULL  → encuesta de una lección tipo `encuesta`.
--   · bloque_id SET   → bloque `encuesta` dentro de una lección de teoría.
--
-- GRANT (regla del repo: tabla nueva = su grant) + RLS: el alumno escribe/lee las SUYAS;
-- el staff las LEE (vista de resultados agregados). Solo esquema `lxp` (§10).
-- ═══════════════════════════════════════════════════════════════════════════

create table lxp.encuesta_respuestas (
  id            uuid primary key default gen_random_uuid(),
  id_alumno     uuid not null references lxp.perfiles(user_id) on delete cascade,
  leccion_id    uuid not null references lxp.lecciones(id) on delete cascade,
  -- NULL = encuesta tipo lección; con valor = bloque `encuesta` de una lección de teoría.
  bloque_id     uuid references lxp.bloques(id) on delete cascade,
  -- Mapa { preguntaId: valor }; valor = string | string[] | number (escala). SIN nota.
  respuestas    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Una respuesta por alumno × encuesta. `coalesce` normaliza el NULL de bloque_id para que
-- la unicidad aplique también a las encuestas de lección (NULLs serían distintos sin esto).
create unique index encuesta_respuestas_unica on lxp.encuesta_respuestas
  (id_alumno, leccion_id, coalesce(bloque_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index encuesta_respuestas_leccion_idx on lxp.encuesta_respuestas (leccion_id);
create index encuesta_respuestas_bloque_idx on lxp.encuesta_respuestas (bloque_id);

create trigger encuesta_respuestas_touch
  before update on lxp.encuesta_respuestas
  for each row execute function lxp.touch_updated_at();

comment on table lxp.encuesta_respuestas is
  'Respuestas de encuesta del alumno (§5C · 0100). SIN calificación — solo recoge. Una '
  'fila por alumno × encuesta (leccion_id + bloque_id NULL=lección / set=bloque teoría).';

-- ── Grants (el `grant on all tables` de 0010 NO alcanza a tablas nuevas · §6/§10) ──
grant select, insert, update, delete on lxp.encuesta_respuestas to authenticated;
grant all on lxp.encuesta_respuestas to service_role;

-- ── RLS: el alumno escribe/lee las SUYAS; el staff las lee (resultados agregados) ──
alter table lxp.encuesta_respuestas enable row level security;

create policy encuesta_respuestas_select on lxp.encuesta_respuestas
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());

create policy encuesta_respuestas_insert on lxp.encuesta_respuestas
  for insert to authenticated
  with check (id_alumno = auth.uid());

create policy encuesta_respuestas_update on lxp.encuesta_respuestas
  for update to authenticated
  using (id_alumno = auth.uid())
  with check (id_alumno = auth.uid());
