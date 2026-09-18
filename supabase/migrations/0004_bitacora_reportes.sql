-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 · Práctica y reportes (DICOM) — el CORAZÓN del producto (§6, prioridad)
-- bitacora_casos (caso real en DICOM) · validaciones (docente + corrección a Eco)
-- reportes (reporte clínico con datos de paciente → genera caso anonimizado)
--
-- ⚠️ El estudio DICOM se guarda en object storage (§3/§9); aquí solo la referencia.
--    La anonimización es bloqueante en el worker `procesar-dicom` (§8) — el caso
--    educativo nunca persiste con PII.
-- ═══════════════════════════════════════════════════════════════════════════

create type lxp.dominio_iaim as enum (
  'indicacion', 'adquisicion', 'interpretacion', 'decision_medica'
);

create type lxp.estado_validacion as enum ('pendiente', 'aprobado', 'rechazado');

create type lxp.origen_caso as enum ('alumno', 'staff');

create type lxp.decision_validacion as enum ('aprobado', 'rechazado');

-- ── bitacora_casos ──
create table lxp.bitacora_casos (
  id                     uuid primary key default gen_random_uuid(),
  id_alumno              uuid not null references lxp.perfiles(user_id) on delete cascade,
  grupo_id               uuid references lxp.grupos(id) on delete set null,
  modulo_id              uuid references lxp.modulos(id) on delete set null,
  organo                 text,
  dominio_iaim           lxp.dominio_iaim,
  -- Referencia al estudio anonimizado en object storage (NUNCA el binario aquí).
  estudio_dicom_ref      text,
  hallazgos              text,
  diagnostico_presuntivo text,
  horas_estimadas        numeric(6,2) not null default 0,
  estado_validacion      lxp.estado_validacion not null default 'pendiente',
  origen                 lxp.origen_caso not null default 'alumno',
  -- Traza de anonimización (§10): quién/cuándo/qué se removió.
  anonimizado_en         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index bitacora_alumno_idx on lxp.bitacora_casos (id_alumno);
create index bitacora_estado_idx on lxp.bitacora_casos (estado_validacion);
create index bitacora_dominio_idx on lxp.bitacora_casos (dominio_iaim);

create trigger bitacora_touch
  before update on lxp.bitacora_casos
  for each row execute function lxp.touch_updated_at();

-- ── validaciones: decisión clínica del docente (§5B / §7A) ──
create table lxp.validaciones (
  id                  uuid primary key default gen_random_uuid(),
  caso_id             uuid not null references lxp.bitacora_casos(id) on delete cascade,
  id_docente          uuid not null references lxp.perfiles(user_id) on delete restrict,
  decision            lxp.decision_validacion not null,
  feedback            text,
  -- Loop de mejora de Eco: si el docente corrigió la sugerencia de Eco, qué cambió.
  correccion_sobre_eco jsonb,
  created_at          timestamptz not null default now()
);

create index validaciones_caso_idx on lxp.validaciones (caso_id);
create index validaciones_docente_idx on lxp.validaciones (id_docente);

-- ── reportes: reporte clínico (con datos de paciente · flujo SEPARADO · §10) ──
create table lxp.reportes (
  id                 uuid primary key default gen_random_uuid(),
  id_medico          uuid not null references lxp.perfiles(user_id) on delete cascade,
  plantilla_id       uuid,   -- FK a lxp.plantillas_reporte (creada en 0007)
  -- Datos de paciente viven SOLO en el reporte clínico, nunca en el caso educativo.
  datos_paciente     jsonb not null default '{}'::jsonb,
  contenido          jsonb not null default '{}'::jsonb,
  pdf_ref            text,
  estado             text not null default 'borrador',   -- borrador|finalizado|enviado
  -- Caso educativo anonimizado derivado (§6): enlaza a bitacora_casos si se generó.
  caso_generado_id   uuid references lxp.bitacora_casos(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index reportes_medico_idx on lxp.reportes (id_medico);

create trigger reportes_touch
  before update on lxp.reportes
  for each row execute function lxp.touch_updated_at();
