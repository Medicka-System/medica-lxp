-- ═══════════════════════════════════════════════════════════════════════════
-- 0023 · La LECCIÓN tiene un TIPO; su contenido vive según el tipo (modelo base
--        del rediseño del constructor · §5B/§5C)
--
-- Rediseño (base · NO editores): hasta 0002/0003 una lección era un contenedor de
-- muchos "bloques" heterogéneos (contenidos + actividades mezclados). El nuevo
-- modelo la vuelve MONO-TIPO: una lección ES teoría, o ES video, o ES autoeval…
-- Cada tipo guarda su contenido en un lugar (modelo HÍBRIDO):
--
--   · teoria                                   → tabla `lxp.bloques` (ORDENABLE)
--   · video|autoevaluacion|tarea|foro|h5p|xapi → columna `lecciones.config` jsonb
--
-- Este archivo deja SOLO el modelo. Los editores de cada tipo (que llenan `bloques`
-- o `config`) los construyen agentes posteriores contra este contrato (ver
-- docs/constructor-lecciones-contrato.md).
--
-- Seed-safe:
--   · `tipo` entra con DEFAULT 'teoria' ⇒ las lecciones existentes (seed, mig 0002)
--     quedan marcadas 'teoria' sin tocar el seed ni romper inserts previos.
--   · `config` entra con DEFAULT '{}'::jsonb.
--   · Las tablas viejas `contenidos`/`actividades` NO se tocan (siguen dando de
--     comer al reader del alumno y a los flujos ya construidos); el puente hacia el
--     nuevo modelo lo decide cada editor de tipo, no esta migración.
--   · Las horas siguen POR LECCIÓN (mig 0022 · trigger a módulo). Sin cambios.
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Enum de los 7 tipos de lección (§5C) ──
do $$
begin
  if not exists (select 1 from pg_type t
                 join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'leccion_tipo' and n.nspname = 'lxp') then
    create type lxp.leccion_tipo as enum (
      'teoria', 'video', 'autoevaluacion', 'tarea', 'foro', 'h5p', 'xapi'
    );
  end if;
end $$;

-- ── 2 · lecciones.tipo (default 'teoria' → seed-safe) ──
alter table lxp.lecciones
  add column if not exists tipo lxp.leccion_tipo not null default 'teoria';

comment on column lxp.lecciones.tipo is
  'Tipo de la lección (§5C · mig 0023). Determina qué editor la abre y DÓNDE vive su '
  'contenido: teoria → tabla lxp.bloques (ordenable); el resto → columna config jsonb.';

-- ── 3 · lecciones.config (config de los tipos NO-teoria) ──
-- video/autoevaluacion/tarea/foro/h5p/xapi guardan aquí su configuración. La FORMA
-- del jsonb la define el editor de cada tipo (contrato), no esta migración.
alter table lxp.lecciones
  add column if not exists config jsonb not null default '{}'::jsonb;

comment on column lxp.lecciones.config is
  'Config del contenido para los tipos config-backed (video/autoevaluacion/tarea/'
  'foro/h5p/xapi · mig 0023). Vacío ({}) para tipo teoria (usa lxp.bloques). La forma '
  'la define el editor de cada tipo.';

-- ── 4 · Tabla bloques: contenido ORDENABLE de las lecciones tipo `teoria` ──
-- `tipo_bloque` es TEXT a propósito (no enum): el editor de teoría define qué
-- sub-tipos existen (párrafo, imagen, cine-loop embebido, KaTeX, cita…) sin pedir
-- una migración nueva por cada uno. `config` guarda el cuerpo del bloque.
create table if not exists lxp.bloques (
  id            uuid primary key default gen_random_uuid(),
  leccion_id    uuid not null references lxp.lecciones(id) on delete cascade,
  orden         integer not null default 0,
  tipo_bloque   text not null,
  config        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bloques_leccion_idx on lxp.bloques (leccion_id, orden);

create trigger bloques_touch
  before update on lxp.bloques
  for each row execute function lxp.touch_updated_at();

comment on table lxp.bloques is
  'Bloques de contenido ORDENABLES de una lección tipo `teoria` (§5C · mig 0023). '
  'El editor de teoría los crea/reordena/edita. tipo_bloque (text) + config (jsonb) '
  'los define el editor, no el esquema.';

-- ── 5 · Grants (el `grant on all tables` de 0010 NO es retroactivo · §6/§10) ──
grant select, insert, update, delete on lxp.bloques to authenticated;
grant all on lxp.bloques to service_role;

-- ── 6 · RLS · bloques: lectura authenticated + escritura es_autoria (mismo patrón
-- que contenidos/actividades · 0010). El alumno LEE (para renderizar la teoría);
-- solo autoría (diseñador/admin · §5B) escribe. ──
alter table lxp.bloques enable row level security;

create policy bloques_read on lxp.bloques
  for select to authenticated using (true);
create policy bloques_write on lxp.bloques
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());
