-- ═══════════════════════════════════════════════════════════════════════════
-- 0024 · Estudio DICOM en el banco curado (§6/§8/§10 · rediseño casos multi-serie)
--
-- El visor DICOM (Cornerstone3D) es TRANSVERSAL: bitácora (alumno), Studio/Casos
-- (curaduría) y Biblioteca (acervo) consumen el MISMO estudio anonimizado. Hasta
-- ahora `casos_biblioteca` solo tenía `dicom_ref` (una referencia suelta, sin
-- estructura de series ni traza), por eso el visor estaba "desconectado" en esas
-- pantallas. Este cambio le da el MISMO modelo de series que `bitacora_casos`
-- (0014): estado del pipeline, estructura de series/multi-frame y traza de
-- anonimización — más un puente opcional al caso de bitácora que lo originó.
--
-- `bitacora_casos.estudio_series` (0014) YA modela N series con `ref` por serie:
-- [{ series_uid, modalidad, frames, instancias, ref }]. El uploader multi-archivo /
-- zip escribe N entradas en ese arreglo (una por serie); NO requiere migración.
--
-- INVARIANTE §10: ningún caso educativo persiste con PII. El worker anonimiza de
-- forma BLOQUEANTE antes de fijar la referencia; el CHECK refuerza que no haya
-- estudio sin traza de anonimización.
--
-- Seed-safe: todo es `add column if not exists` con default; no requiere datos.
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.casos_biblioteca
  -- Estado del pipeline de ingesta (null en casos sin estudio DICOM). Reusa el
  -- enum de 0014 (mismo ciclo de vida que la bitácora).
  add column if not exists estudio_estado lxp.estudio_dicom_estado,
  -- Series/multi-frame del estudio anonimizado (cine-loops):
  -- [{ series_uid, modalidad, frames, instancias, ref }] — igual que bitacora_casos.
  add column if not exists estudio_series jsonb not null default '[]'::jsonb,
  -- Traza auditable de la anonimización (§10).
  add column if not exists anonimizacion jsonb,
  add column if not exists anonimizado_en timestamptz,
  -- Puente opcional al caso de bitácora que originó la curaduría (origen 'alumno').
  -- null = caso cargado directo por staff (origen 'staff'). Solo-lxp, no acopla CORA.
  add column if not exists origen_caso_id uuid references lxp.bitacora_casos(id) on delete set null;

comment on column lxp.casos_biblioteca.estudio_series is
  'Series DICOM del estudio anonimizado (multi-frame / cine-loops): arreglo de '
  '{ series_uid, modalidad, frames, instancias, ref }. Mismo modelo que '
  'bitacora_casos (0014). El binario vive en object storage; aquí solo estructura.';

comment on column lxp.casos_biblioteca.origen_caso_id is
  'Caso de bitácora que originó la curaduría (§5B, puente alumno→banco). null = '
  'caso cargado directo por staff. Al curar, el estudio se hereda de ese caso.';

-- Refuerzo del invariante §10 (igual que bitacora, 0014): un estudio con series
-- anonimizadas SIEMPRE debe tener su traza (anonimizado_en). Las filas legacy con
-- `dicom_ref` suelto y sin series (estudio_series = []) siguen siendo válidas.
alter table lxp.casos_biblioteca
  drop constraint if exists casos_biblioteca_estudio_anonimizado_check;
alter table lxp.casos_biblioteca
  add constraint casos_biblioteca_estudio_anonimizado_check
  check (estudio_series = '[]'::jsonb or anonimizado_en is not null);

create index if not exists casos_biblioteca_estudio_estado_idx
  on lxp.casos_biblioteca (estudio_estado);
create index if not exists casos_biblioteca_origen_caso_idx
  on lxp.casos_biblioteca (origen_caso_id);
