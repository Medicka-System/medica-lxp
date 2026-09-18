-- ═══════════════════════════════════════════════════════════════════════════
-- 0018 · Course builder — rúbricas como catálogo, reactivos, TTS (§5B/§7A · cb)
--
-- Alcance (SOLO esquema `lxp`, nunca `public`/CORA · §10):
--   1. Rúbricas → CATÁLOGO reutilizable (tipo estudios_reportes | tareas). Deja de
--      ser inline-por-tarea: la actividad la REFERENCIA (actividades.rubrica_id).
--   2. Reactivos de autoevaluación (banco importable de CSV/Excel; la clave objetiva
--      la lee el autocalificador de Eco · §7A). La clave vive SOLO para staff (RLS).
--   3. TTS: config de proveedor/voz editable en BD (no hardcode, patrón eco_config)
--      + registro de audios sintetizados (el binario vive en object storage · §3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · RÚBRICAS COMO CATÁLOGO REUTILIZABLE (§5B)
-- La rúbrica ya existía atada a UNA actividad (0003). La volvemos catálogo: se le
-- da identidad propia (nombre, tipo, publicado) y la actividad la referencia. Se
-- mantiene `actividad_id` NULLABLE por compatibilidad con filas inline previas.
-- ═══════════════════════════════════════════════════════════════════════════
create type lxp.rubrica_tipo as enum ('estudios_reportes', 'tareas');

-- `nombre` con DEFAULT para no romper inserts previos que no lo traen (p. ej. el
-- seed inserta (actividad_id, criterios)); el course builder siempre da un nombre real.
alter table lxp.rubricas
  add column if not exists nombre      text not null default 'Rúbrica',
  add column if not exists tipo        lxp.rubrica_tipo not null default 'tareas',
  add column if not exists descripcion text,
  add column if not exists publicado   boolean not null default false,
  add column if not exists creado_por  uuid references lxp.perfiles(user_id) on delete set null,
  add column if not exists updated_at  timestamptz not null default now();

-- Deja de ser obligatoriamente inline: una rúbrica de catálogo no cuelga de una
-- actividad (se referencia desde muchas). Compat: la FK sigue existiendo, nullable.
alter table lxp.rubricas alter column actividad_id drop not null;

comment on column lxp.rubricas.tipo is
  'estudios_reportes = validación clínica de casos/reportes (criterio del docente); '
  'tareas = evaluación de entregas (pedagógico, diseñador · §5B).';
comment on column lxp.rubricas.actividad_id is
  'DEPRECADO como vínculo primario: se conserva por compat con rúbricas inline (0003). '
  'El vínculo canónico es actividades.rubrica_id (catálogo reutilizable).';

create index if not exists rubricas_tipo_idx on lxp.rubricas (tipo) where publicado;

create trigger rubricas_touch
  before update on lxp.rubricas
  for each row execute function lxp.touch_updated_at();

-- La actividad REFERENCIA una rúbrica del catálogo (reutilizable entre actividades).
alter table lxp.actividades
  add column if not exists rubrica_id uuid references lxp.rubricas(id) on delete set null;

create index if not exists actividades_rubrica_idx on lxp.actividades (rubrica_id);

comment on column lxp.actividades.rubrica_id is
  'Rúbrica del catálogo (lxp.rubricas) que evalúa esta actividad. La actividad solo '
  'la referencia; la rúbrica es reutilizable (§5B).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · REACTIVOS DE AUTOEVALUACIÓN (banco importable · §7A)
-- Preguntas de una actividad tipo `autoevaluacion`. La clave objetiva (`correcta`)
-- la lee el AUTOCALIFICADOR de Eco (tool, sin LLM · §7A). Contiene la respuesta
-- correcta ⇒ RLS: solo staff la lee (el alumno recibe el reactivo saneado por el
-- endpoint del web, sin `correcta`).
-- ═══════════════════════════════════════════════════════════════════════════
create type lxp.reactivo_tipo as enum (
  'opcion_multiple',  -- una correcta
  'multi',            -- varias correctas
  'verdadero_falso',
  'abierta'           -- texto libre (no auto-calificable; la juzga Sonnet)
);

create table lxp.reactivos (
  id            uuid primary key default gen_random_uuid(),
  actividad_id  uuid not null references lxp.actividades(id) on delete cascade,
  orden         integer not null default 0,
  tipo          lxp.reactivo_tipo not null default 'opcion_multiple',
  enunciado     text not null,
  -- Opciones como arreglo [{clave, texto}, ...] (vacío para 'abierta').
  opciones      jsonb not null default '[]'::jsonb,
  -- Clave(s) correcta(s): 'a' o ['a','c']. NULL para 'abierta'. La lee el
  -- autocalificador (§7A) — NUNCA se expone al alumno (RLS solo-staff).
  correcta      jsonb,
  puntaje       numeric(5,2) not null default 1,
  -- Dominio I-AIM opcional (para proyectar a competencia y proponer repaso · §1).
  dominio_iaim  lxp.dominio_iaim,
  retro         text,   -- retroalimentación mostrada tras responder
  origen        text not null default 'manual',  -- 'manual' | 'import' | 'eco'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reactivos_actividad_idx on lxp.reactivos (actividad_id, orden);

create trigger reactivos_touch
  before update on lxp.reactivos
  for each row execute function lxp.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · TTS · config editable + registro de audios (§3 · patrón eco_config 0016)
-- El proveedor/voz NO se hardcodea: vive en BD y es intercambiable (OpenAI hoy,
-- ElevenLabs por config mañana · mismo principio model-agnostic que Eco §7A).
-- ═══════════════════════════════════════════════════════════════════════════
create table lxp.tts_config (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  activo        boolean not null default true,
  proveedor     text not null default 'openai',   -- 'openai' | 'elevenlabs' | 'mock'
  modelo        text not null default 'tts-1',
  voz           text not null default 'nova',
  velocidad     numeric(3,2) not null default 1.0, -- 0.25..4.0
  formato       text not null default 'mp3',       -- 'mp3' | 'wav' | 'opus'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Una sola config activa a la vez (igual que eco_config · 0016).
create unique index tts_config_activa_uidx on lxp.tts_config (activo) where activo;

create trigger tts_config_touch
  before update on lxp.tts_config
  for each row execute function lxp.touch_updated_at();

-- Config por defecto (MOCK hasta cablear la key real, como Eco · ECO_PROVIDER).
insert into lxp.tts_config (nombre, activo, proveedor, modelo, voz, velocidad, formato)
values ('tts-default', true, 'openai', 'tts-1', 'nova', 1.0, 'mp3')
on conflict (nombre) do nothing;

create type lxp.tts_estado as enum ('procesando', 'listo', 'error');

create table lxp.tts_audios (
  id            uuid primary key default gen_random_uuid(),
  -- Contenido de lección al que narra (opcional: TTS suelto también existe).
  contenido_id  uuid references lxp.contenidos(id) on delete set null,
  texto         text not null,
  proveedor     text not null,
  modelo        text not null,
  voz           text not null,
  velocidad     numeric(3,2) not null default 1.0,
  formato       text not null default 'mp3',
  estado        lxp.tts_estado not null default 'procesando',
  -- Clave del binario en object storage (§3): el audio NUNCA vive en Postgres.
  recurso_ref   text,
  duracion_seg  integer,
  error         text,
  creado_por    uuid references lxp.perfiles(user_id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tts_audios_contenido_idx on lxp.tts_audios (contenido_id);
create index tts_audios_estado_idx on lxp.tts_audios (estado);

create trigger tts_audios_touch
  before update on lxp.tts_audios
  for each row execute function lxp.touch_updated_at();

comment on column lxp.tts_audios.recurso_ref is
  'Clave del audio en object storage (§3): el binario NUNCA vive en Postgres ni en '
  'el VPS de apps. El `api` firma la lectura de vida corta para reproducir.';

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS para las tablas NUEVAS (`grant on all tables` de 0010 NO es retroactivo,
-- así que se conceden aquí · §6/§10). Las rúbricas/actividades ya tenían grants.
-- ═══════════════════════════════════════════════════════════════════════════
grant select, insert, update, delete
  on lxp.reactivos, lxp.tts_config, lxp.tts_audios
  to authenticated;
grant all
  on lxp.reactivos, lxp.tts_config, lxp.tts_audios
  to service_role;

-- ── Habilitar RLS ──
alter table lxp.reactivos  enable row level security;
alter table lxp.tts_config enable row level security;
alter table lxp.tts_audios enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · reactivos: contienen la CLAVE correcta ⇒ solo staff lee/escribe. El
-- alumno recibe los reactivos saneados por el endpoint del web (sin `correcta`),
-- nunca por SELECT directo. Escritura = autoría (diseñador/admin · §5B).
-- ═══════════════════════════════════════════════════════════════════════════
create policy reactivos_select on lxp.reactivos
  for select to authenticated using (lxp.es_staff());
create policy reactivos_write on lxp.reactivos
  for all to authenticated
  using (lxp.es_autoria()) with check (lxp.es_autoria());

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · tts_config: config del sistema (§5B) ⇒ solo super_admin la escribe;
-- el staff la lee (para saber con qué voz se sintetiza).
-- ═══════════════════════════════════════════════════════════════════════════
create policy tts_config_select on lxp.tts_config
  for select to authenticated using (lxp.es_staff());
create policy tts_config_write on lxp.tts_config
  for all to authenticated
  using (lxp.rol_actual() = 'super_admin')
  with check (lxp.rol_actual() = 'super_admin');

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · tts_audios: el staff que lo genera lo ve; el resto del staff también
-- (recurso compartido de autoría). Escritura de estado la hace el `api`/worker
-- con service_role (omite RLS); la autoría puede encolar renders.
-- ═══════════════════════════════════════════════════════════════════════════
create policy tts_audios_select on lxp.tts_audios
  for select to authenticated
  using (creado_por = auth.uid() or lxp.es_staff());
create policy tts_audios_write on lxp.tts_audios
  for all to authenticated
  using (lxp.es_autoria()) with check (lxp.es_autoria());
