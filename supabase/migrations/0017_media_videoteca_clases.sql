-- ═══════════════════════════════════════════════════════════════════════════
-- 0017 · Media, videoteca, clases en vivo y progreso de players (§6/§7/§8/§9 · Sprint 6)
--
-- Contenido en vivo y multimedia integrado al loop:
--   · videoteca            — registro de videos (subidos / grabaciones de Zoom / Stream).
--   · clases               — clases en vivo (Zoom / MiCo+): agenda, enlaces, estado.
--   · reproduccion_progreso — progreso del player por alumno × contenido (video/H5P/SCORM).
--
-- El binario (video/grabación/paquete) vive SIEMPRE en object storage (§3/§9); aquí
-- solo referencias y metadatos. El `api` es el único firmante de URLs; el `worker`
-- `ingesta-grabacion-zoom` descarga de Zoom y sube a storage (§8, job #3).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3). RLS en todas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ──
-- Origen del asset de videoteca: subida directa (staff), grabación de Zoom, o Stream.
create type lxp.videoteca_origen as enum ('subida', 'zoom', 'stream');

-- Estado del asset en su pipeline de ingesta (relevante para grabaciones de Zoom).
create type lxp.videoteca_estado as enum (
  'procesando',  -- creado; esperando que el worker suba el binario a storage
  'listo',       -- binario disponible en object storage; reproducible
  'error'        -- falló la ingesta (grabación no descargada/subida)
);

-- Plataforma de la clase en vivo. MiCo+ (Mindray) por ahora solo se enlaza/agenda (§9).
create type lxp.clase_plataforma as enum ('zoom', 'mico_plus');

-- Estado del ciclo de vida de la clase.
create type lxp.clase_estado as enum (
  'agendada', 'en_curso', 'finalizada', 'cancelada'
);

-- ── clases: clases en vivo (Zoom / MiCo+) ligadas al grupo (y opcionalmente lección) ──
create table lxp.clases (
  id                 uuid primary key default gen_random_uuid(),
  grupo_id           uuid not null references lxp.grupos(id) on delete cascade,
  leccion_id         uuid references lxp.lecciones(id) on delete set null,
  docente_id         uuid references lxp.perfiles(user_id) on delete set null,
  plataforma         lxp.clase_plataforma not null default 'zoom',
  titulo             text not null,
  descripcion        text,
  inicio_programado  timestamptz,
  duracion_min       integer,
  estado             lxp.clase_estado not null default 'agendada',
  -- Identificador de la reunión en la plataforma externa (Zoom meeting id, etc.).
  reunion_externa_id text,
  -- Enlace para que el alumno se una (join_url). Enlace de inicio (start_url del host,
  -- sensible): lo entrega el endpoint `iniciar`, no se difunde por lectura general.
  enlace_union       text,
  enlace_inicio      text,
  -- Payload crudo de la reunión externa (para trazabilidad; sin datos sensibles del alumno).
  reunion_externa    jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index clases_grupo_idx    on lxp.clases (grupo_id, inicio_programado);
create index clases_leccion_idx  on lxp.clases (leccion_id);
create index clases_reunion_idx  on lxp.clases (reunion_externa_id);

create trigger clases_touch
  before update on lxp.clases
  for each row execute function lxp.touch_updated_at();

comment on column lxp.clases.enlace_inicio is
  'start_url del host (sensible): NO difundir por lectura general; lo entrega el '
  'endpoint iniciar al docente. Endurecer con guard/RLS por membresía en Sprint 9.';

-- ── videoteca: registro de videos (subidos / grabaciones / Stream) ──
create table lxp.videoteca (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descripcion    text,
  origen         lxp.videoteca_origen not null default 'subida',
  estado         lxp.videoteca_estado not null default 'listo',
  -- Clave del binario en object storage (null mientras `procesando`).
  recurso_ref    text,
  duracion_seg   integer,
  -- Ligas al loop de aprendizaje (todas opcionales según el origen del video).
  grupo_id       uuid references lxp.grupos(id) on delete set null,
  leccion_id     uuid references lxp.lecciones(id) on delete set null,
  contenido_id   uuid references lxp.contenidos(id) on delete set null,
  clase_id       uuid references lxp.clases(id) on delete set null,
  -- Metadatos de la fuente externa (Zoom: {meeting_id, recording_id, file_type, ...}).
  fuente_externa jsonb,
  created_by     uuid references lxp.perfiles(user_id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index videoteca_grupo_idx    on lxp.videoteca (grupo_id);
create index videoteca_leccion_idx  on lxp.videoteca (leccion_id);
create index videoteca_clase_idx    on lxp.videoteca (clase_id);
create index videoteca_estado_idx   on lxp.videoteca (estado);

create trigger videoteca_touch
  before update on lxp.videoteca
  for each row execute function lxp.touch_updated_at();

comment on column lxp.videoteca.recurso_ref is
  'Clave del binario en object storage (§3/§9): el video NUNCA vive en Postgres ni en '
  'el VPS de apps. null mientras estado = procesando (grabación aún no subida).';

-- ── reproduccion_progreso: progreso del player por alumno × contenido ──
-- Cubre video, H5P (además del xAPI que emite) y SCORM (estado_scorm = cmi/suspend_data).
create table lxp.reproduccion_progreso (
  id            uuid primary key default gen_random_uuid(),
  alumno_id     uuid not null references lxp.perfiles(user_id) on delete cascade,
  contenido_id  uuid not null references lxp.contenidos(id) on delete cascade,
  posicion_seg  integer not null default 0,
  duracion_seg  integer,
  porcentaje    numeric(5,2) not null default 0,
  completado    boolean not null default false,
  -- Estado de runtime SCORM (cmi.core / suspend_data) para reanudar el paquete.
  estado_scorm  jsonb,
  actualizado_en timestamptz not null default now(),
  unique (alumno_id, contenido_id)
);

create index reproduccion_progreso_alumno_idx
  on lxp.reproduccion_progreso (alumno_id);

comment on column lxp.reproduccion_progreso.estado_scorm is
  'Runtime SCORM (cmi.core.lesson_status, score, suspend_data) capturado por el player '
  'para reanudar y reportar progreso; el xAPI de completado se emite al LRS aparte.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants para las tablas NUEVAS (0010 concedió sobre las tablas de entonces; el
-- `grant on all tables` no es retroactivo, así que se conceden aquí · §6/§10).
-- ═══════════════════════════════════════════════════════════════════════════
grant select, insert, update, delete
  on lxp.videoteca, lxp.clases, lxp.reproduccion_progreso
  to authenticated;
grant all
  on lxp.videoteca, lxp.clases, lxp.reproduccion_progreso
  to service_role;

-- ── Habilitar RLS ──
alter table lxp.clases                enable row level security;
alter table lxp.videoteca             enable row level security;
alter table lxp.reproduccion_progreso enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · videoteca y clases: lectura para inscritos autenticados; escritura = staff.
-- (Endurecer a membresía real del grupo en Sprint 9, como el foro/entregas · 0010.)
-- ═══════════════════════════════════════════════════════════════════════════
create policy videoteca_read on lxp.videoteca
  for select to authenticated using (auth.uid() is not null);
create policy videoteca_write on lxp.videoteca
  for all to authenticated
  using (lxp.es_staff()) with check (lxp.es_staff());

create policy clases_read on lxp.clases
  for select to authenticated using (auth.uid() is not null);
create policy clases_write on lxp.clases
  for all to authenticated
  using (lxp.es_docente_o_mas()) with check (lxp.es_docente_o_mas());

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · reproduccion_progreso: el alumno solo lo SUYO y con acceso_activo; staff lee.
-- (Patrón de `entregas` en 0010.)
-- ═══════════════════════════════════════════════════════════════════════════
create policy reproduccion_progreso_select on lxp.reproduccion_progreso
  for select to authenticated
  using (alumno_id = auth.uid() or lxp.es_staff());
create policy reproduccion_progreso_insert on lxp.reproduccion_progreso
  for insert to authenticated
  with check (alumno_id = auth.uid() and lxp.acceso_activo());
create policy reproduccion_progreso_update on lxp.reproduccion_progreso
  for update to authenticated
  using (alumno_id = auth.uid() and lxp.acceso_activo())
  with check (alumno_id = auth.uid() and lxp.acceso_activo());
