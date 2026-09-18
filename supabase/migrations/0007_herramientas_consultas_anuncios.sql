-- ═══════════════════════════════════════════════════════════════════════════
-- 0007 · Herramientas, comunicación (§6)
-- plantillas_reporte · calculadoras · recursos_docente (almacén personal)
-- anuncios (alcance/canales/vigencia) · consultas + consulta_mensajes (1:1)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── plantillas_reporte (herramienta clínica · reemplaza Word · §6/§6.5) ──
create table lxp.plantillas_reporte (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  tipo_estudio  text,
  estructura    jsonb not null default '{}'::jsonb,   -- secciones/campos/guía
  publicado     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger plantillas_reporte_touch
  before update on lxp.plantillas_reporte
  for each row execute function lxp.touch_updated_at();

-- FK diferida de reportes → plantillas_reporte (la tabla reportes se creó en 0004).
alter table lxp.reportes
  add constraint reportes_plantilla_fk
  foreign key (plantilla_id) references lxp.plantillas_reporte(id) on delete set null;

-- ── calculadoras (catálogo de herramientas clínicas) ──
create table lxp.calculadoras (
  id            uuid primary key default gen_random_uuid(),
  clave         text not null unique,
  nombre        text not null,
  descripcion   text,
  definicion    jsonb not null default '{}'::jsonb,   -- inputs/fórmula/salida
  publicado     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── recursos_docente (almacén personal del docente · §5B) ──
create table lxp.recursos_docente (
  id            uuid primary key default gen_random_uuid(),
  id_docente    uuid not null references lxp.perfiles(user_id) on delete cascade,
  titulo        text not null,
  tipo          text,
  recurso_ref   text,
  created_at    timestamptz not null default now()
);

create index recursos_docente_idx on lxp.recursos_docente (id_docente);

-- ── anuncios (segmentación por rol, canales, vigencia · §6) ──
create table lxp.anuncios (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid references lxp.perfiles(user_id) on delete set null,
  titulo        text not null,
  cuerpo        text not null,
  alcance       jsonb not null default '{}'::jsonb,    -- roles/grupos destino
  canales       text[] not null default array['in_app'],  -- in_app|correo|whatsapp
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  created_at    timestamptz not null default now()
);

create index anuncios_vigencia_idx on lxp.anuncios (vigente_desde, vigente_hasta);

-- ── consultas: canal 1:1 alumno↔docente (§5B) ──
create table lxp.consultas (
  id            uuid primary key default gen_random_uuid(),
  id_alumno     uuid not null references lxp.perfiles(user_id) on delete cascade,
  id_docente    uuid references lxp.perfiles(user_id) on delete set null,
  asunto        text not null,
  estado        text not null default 'abierta',   -- abierta | cerrada
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index consultas_alumno_idx on lxp.consultas (id_alumno);
create index consultas_docente_idx on lxp.consultas (id_docente);

create trigger consultas_touch
  before update on lxp.consultas
  for each row execute function lxp.touch_updated_at();

-- ── consulta_mensajes ──
create table lxp.consulta_mensajes (
  id            uuid primary key default gen_random_uuid(),
  consulta_id   uuid not null references lxp.consultas(id) on delete cascade,
  autor_id      uuid not null references lxp.perfiles(user_id) on delete cascade,
  cuerpo        text not null,
  created_at    timestamptz not null default now()
);

create index consulta_mensajes_consulta_idx on lxp.consulta_mensajes (consulta_id);
