-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 · Actividades de lección y evaluación (§6)
-- actividades (tarea | autoevaluacion | foro) → rubricas (las define el diseñador)
-- entregas (respuesta del alumno) · foro_mensajes (discusión CERRADA del grupo)
-- ═══════════════════════════════════════════════════════════════════════════

create type lxp.actividad_tipo as enum ('tarea', 'autoevaluacion', 'foro');

create type lxp.entrega_estado as enum (
  'pendiente', 'enviada', 'calificada', 'devuelta'
);

-- ── actividades: bloque que el diseñador coloca en una lección (§1/§5B) ──
create table lxp.actividades (
  id            uuid primary key default gen_random_uuid(),
  leccion_id    uuid not null references lxp.lecciones(id) on delete cascade,
  tipo          lxp.actividad_tipo not null,
  titulo        text not null,
  instrucciones text,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index actividades_leccion_idx on lxp.actividades (leccion_id, orden);

-- ── rubricas: criterios y pesos (pedagógico = diseñador · §5B) ──
create table lxp.rubricas (
  id            uuid primary key default gen_random_uuid(),
  actividad_id  uuid not null references lxp.actividades(id) on delete cascade,
  -- Criterios como arreglo estructurado [{criterio, descripcion, peso}, ...].
  criterios     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index rubricas_actividad_idx on lxp.rubricas (actividad_id);

-- ── entregas: respuesta del alumno a una actividad ──
create table lxp.entregas (
  id            uuid primary key default gen_random_uuid(),
  actividad_id  uuid not null references lxp.actividades(id) on delete cascade,
  grupo_id      uuid references lxp.grupos(id) on delete set null,
  id_alumno     uuid not null references lxp.perfiles(user_id) on delete cascade,
  contenido     jsonb not null default '{}'::jsonb,   -- respuesta (texto/opciones/refs)
  nota          numeric(5,2),
  estado        lxp.entrega_estado not null default 'pendiente',
  feedback      text,
  -- Traza de si la nota provino de una sugerencia de Eco (loop de mejora · §7A).
  eco_sugerida  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (actividad_id, id_alumno)
);

create index entregas_alumno_idx on lxp.entregas (id_alumno);
create index entregas_actividad_idx on lxp.entregas (actividad_id);

create trigger entregas_touch
  before update on lxp.entregas
  for each row execute function lxp.touch_updated_at();

-- ── foro_mensajes: foro CERRADO del grupo (actividad tipo foro · §1) ──
create table lxp.foro_mensajes (
  id            uuid primary key default gen_random_uuid(),
  actividad_id  uuid not null references lxp.actividades(id) on delete cascade,
  grupo_id      uuid not null references lxp.grupos(id) on delete cascade,
  autor_id      uuid not null references lxp.perfiles(user_id) on delete cascade,
  parent_id     uuid references lxp.foro_mensajes(id) on delete cascade,
  cuerpo        text not null,
  created_at    timestamptz not null default now()
);

create index foro_mensajes_actividad_idx on lxp.foro_mensajes (actividad_id, grupo_id);
