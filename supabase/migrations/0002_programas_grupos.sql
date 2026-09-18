-- ═══════════════════════════════════════════════════════════════════════════
-- 0002 · Programas y grupos (modelo de herencia · §6)
-- programas (plantilla viva) → modulos → lecciones → contenidos
-- grupos (instancia de un programa) + grupo_overrides (personalización puntual)
-- La inscripción alumno↔grupo vive en CORA (`public`, se lee · §6/§10).
-- ═══════════════════════════════════════════════════════════════════════════

create type lxp.contenido_tipo as enum (
  'video', 'h5p', 'scorm', 'xapi', 'texto', 'quiz'
);

create type lxp.modalidad as enum ('sincrono', 'asincrono');

-- ── programas: plantilla / fuente de verdad viva del temario ──
create table lxp.programas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  publicado     boolean not null default false,
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger programas_touch
  before update on lxp.programas
  for each row execute function lxp.touch_updated_at();

-- ── modulos ──
create table lxp.modulos (
  id            uuid primary key default gen_random_uuid(),
  programa_id   uuid not null references lxp.programas(id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  orden         integer not null default 0,
  horas         numeric(6,2) not null default 0,   -- horas acumulables (§5B)
  created_at    timestamptz not null default now()
);

create index modulos_programa_idx on lxp.modulos (programa_id, orden);

-- ── lecciones ──
create table lxp.lecciones (
  id            uuid primary key default gen_random_uuid(),
  modulo_id     uuid not null references lxp.modulos(id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index lecciones_modulo_idx on lxp.lecciones (modulo_id, orden);

-- ── contenidos (video | h5p | scorm | xapi | texto | quiz) ──
create table lxp.contenidos (
  id            uuid primary key default gen_random_uuid(),
  leccion_id    uuid not null references lxp.lecciones(id) on delete cascade,
  tipo          lxp.contenido_tipo not null,
  titulo        text not null,
  -- Referencia al recurso (object storage / paquete H5P/SCORM / cuerpo de texto).
  recurso_ref   text,
  cuerpo        text,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index contenidos_leccion_idx on lxp.contenidos (leccion_id, orden);

-- ── grupos: instancia de un programa (§6) ──
create table lxp.grupos (
  id            uuid primary key default gen_random_uuid(),
  programa_id   uuid not null references lxp.programas(id) on delete restrict,
  nombre        text not null,
  modalidad     lxp.modalidad not null,
  fecha_inicio  date,
  fecha_fin     date,
  -- docente responsable (perfil LXP con rol docente).
  docente_id    uuid references lxp.perfiles(user_id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index grupos_programa_idx on lxp.grupos (programa_id);
create index grupos_docente_idx on lxp.grupos (docente_id);

create trigger grupos_touch
  before update on lxp.grupos
  for each row execute function lxp.touch_updated_at();

-- ── grupo_overrides: personalizaciones puntuales de un grupo sobre la plantilla ──
create table lxp.grupo_overrides (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references lxp.grupos(id) on delete cascade,
  -- Qué entidad de la plantilla se sobreescribe y con qué (patch JSON).
  entidad       text not null,           -- 'modulo' | 'leccion' | 'contenido' | ...
  entidad_id    uuid not null,
  patch         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index grupo_overrides_grupo_idx on lxp.grupo_overrides (grupo_id);
