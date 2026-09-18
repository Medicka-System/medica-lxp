-- ═══════════════════════════════════════════════════════════════════════════
-- 0014 · Pipeline DICOM en la bitácora (§6/§8/§10 · Sprint 4.7)
--
-- Ajusta `bitacora_casos` para el estudio DICOM real: estado del pipeline de
-- ingesta, estructura de series/multi-frame (cine-loops) y TRAZA de anonimización.
-- El binario vive en object storage (§3); aquí solo referencias y metadatos.
--
-- INVARIANTE §10: el caso educativo NUNCA persiste con PII. El worker
-- `procesar-dicom` anonimiza de forma BLOQUEANTE antes de fijar la referencia del
-- estudio; el CHECK de abajo refuerza que no haya estudio sin traza de anonimización.
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- Estado del estudio en el pipeline de ingesta (§8, job procesar-dicom).
create type lxp.estudio_dicom_estado as enum (
  'pendiente',    -- caso creado; esperando la subida del binario
  'recibido',     -- binario en object storage; encolado para procesar
  'procesando',   -- worker parseando/anonimizando
  'anonimizado',  -- PII removida; estudio educativo listo
  'error'         -- falló el pipeline (no se persiste nada con PII)
);

alter table lxp.bitacora_casos
  -- Estado del pipeline (null en casos sin estudio DICOM, p. ej. mocks previos).
  add column if not exists estudio_estado lxp.estudio_dicom_estado,
  -- Series/multi-frame del estudio anonimizado (cine-loops):
  -- [{ series_uid, modalidad, frames, instancias, ref }]
  add column if not exists estudio_series jsonb not null default '[]'::jsonb,
  -- Traza de anonimización (§10): { campos_removidos[], removidos_n, motor, version, por }.
  add column if not exists anonimizacion jsonb;

comment on column lxp.bitacora_casos.estudio_series is
  'Series DICOM del estudio anonimizado (multi-frame / cine-loops): arreglo de '
  '{ series_uid, modalidad, frames, instancias, ref }. El binario vive en object '
  'storage; aquí solo la estructura y su referencia.';

comment on column lxp.bitacora_casos.anonimizacion is
  'Traza auditable de la anonimización (§10): qué campos PII se removieron, cuántos, '
  'con qué motor/versión y por quién. Sin esta traza no debe existir estudio_dicom_ref.';

-- Refuerzo del invariante §10: no puede haber referencia a estudio educativo sin
-- que conste su anonimización (timestamp de traza). El worker fija ambos a la vez.
alter table lxp.bitacora_casos
  drop constraint if exists bitacora_estudio_anonimizado_check;
alter table lxp.bitacora_casos
  add constraint bitacora_estudio_anonimizado_check
  check (estudio_dicom_ref is null or anonimizado_en is not null);

create index if not exists bitacora_estudio_estado_idx
  on lxp.bitacora_casos (estudio_estado);
