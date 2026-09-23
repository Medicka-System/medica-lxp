-- ═══════════════════════════════════════════════════════════════════════════
-- 0035 · Anotaciones y mediciones del visor DICOM (§4.7 · FASE 2)
--
-- Las mediciones (distancia en mm, área/elipse, ángulo) y anotaciones (flecha, texto)
-- se guardan como CAPA de datos asociada al ESTUDIO del caso — el JSON de la anotación
-- de Cornerstone3D, NUNCA quemadas en el píxel. Con AUTOR y fecha: el siguiente que abre
-- el estudio las ve; el autor edita/borra las suyas. El valor en mm sale de la
-- calibración del DICOM (pixel spacing / región US) que ya extrae la FASE 1.
--
-- Estable por (caso, serie, frame): el `imageId` de Cornerstone lleva la URL firmada
-- (cambia por sesión), así que se guarda serie+frame y el visor re-liga al abrir.
--
-- ALCANCE por tabla del estudio (TRANSVERSAL, como el pipeline DICOM):
--   · bitacora_casos  → el alumno dueño y el docente pueden medir/guardar; cada quien
--     edita LO SUYO; ambos ven todo lo del caso.
--   · casos_biblioteca (CURADOS) → CONGELADOS: se conservan las mediciones ORIGINALES
--     del curador (visibles a todos), pero NADIE guarda nuevas por el visor (RLS bloquea
--     escritura). Cualquiera puede medir encima para explorar; no se persiste.
--
-- Windowing/ganancia (brillo/contraste) NO se guarda: es por sesión (no vive aquí).
--
-- Seed-safe / idempotente. Solo esquema `lxp`; jamás `public` de CORA (§10). Grant base
-- OBLIGATORIO (no retroactivo · lección de 0020/0021): sin él, RLS da "permission denied".
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists lxp.anotaciones_dicom (
  id           uuid primary key default gen_random_uuid(),
  -- Caso dueño del estudio (bitacora_casos o casos_biblioteca) — sin FK cruzada por
  -- tabla; el par (tabla, caso_id) lo identifica (mismo patrón que el pipeline DICOM).
  caso_id      uuid not null,
  tabla        text not null check (tabla in ('bitacora_casos', 'casos_biblioteca')),
  -- Ubicación estable dentro del estudio (el visor re-liga el imageId firmado al abrir).
  serie        int  not null default 0,
  frame        int  not null default 0,
  autor_id     uuid not null references lxp.perfiles(user_id) on delete cascade,
  autor_nombre text not null default '',
  -- toolName de Cornerstone: Length | Angle | EllipticalROI | RectangleROI | Probe | ArrowAnnotate…
  tipo         text not null,
  -- JSON crudo de la anotación de Cornerstone (handles en coords de mundo = mm, metadata…).
  datos        jsonb not null,
  -- Valor medido legible ("23.4 mm", "1.2 cm²", "48°"); null si la herramienta no mide.
  valor        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists anotaciones_dicom_caso_idx  on lxp.anotaciones_dicom (tabla, caso_id);
create index if not exists anotaciones_dicom_autor_idx on lxp.anotaciones_dicom (autor_id);

drop trigger if exists anotaciones_dicom_touch on lxp.anotaciones_dicom;
create trigger anotaciones_dicom_touch
  before update on lxp.anotaciones_dicom
  for each row execute function lxp.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — todos ven las del estudio; solo el AUTOR edita las suyas; curados congelados
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.anotaciones_dicom enable row level security;

-- SELECT: el autor; el staff (docente+); las de un curado (públicas); o las de una
-- bitácora que el alumno posee (ve TODO lo de su caso, incluidas las del docente).
drop policy if exists anotaciones_dicom_select on lxp.anotaciones_dicom;
create policy anotaciones_dicom_select on lxp.anotaciones_dicom
  for select to authenticated
  using (
    autor_id = auth.uid()
    or lxp.es_docente_o_mas()
    or tabla = 'casos_biblioteca'
    or (
      tabla = 'bitacora_casos'
      and exists (
        select 1 from lxp.bitacora_casos c
        where c.id = caso_id and c.id_alumno = auth.uid()
      )
    )
  );

-- INSERT: solo en bitácora (los curados están congelados), como uno mismo, y si el caso
-- es tuyo (alumno dueño) o eres docente+ (validando el caso del alumno).
drop policy if exists anotaciones_dicom_insert on lxp.anotaciones_dicom;
create policy anotaciones_dicom_insert on lxp.anotaciones_dicom
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and tabla = 'bitacora_casos'
    and (
      lxp.es_docente_o_mas()
      or exists (
        select 1 from lxp.bitacora_casos c
        where c.id = caso_id and c.id_alumno = auth.uid()
      )
    )
  );

-- UPDATE / DELETE: solo el autor, y solo en bitácora (nunca en curados).
drop policy if exists anotaciones_dicom_update on lxp.anotaciones_dicom;
create policy anotaciones_dicom_update on lxp.anotaciones_dicom
  for update to authenticated
  using (autor_id = auth.uid() and tabla = 'bitacora_casos')
  with check (autor_id = auth.uid() and tabla = 'bitacora_casos');

drop policy if exists anotaciones_dicom_delete on lxp.anotaciones_dicom;
create policy anotaciones_dicom_delete on lxp.anotaciones_dicom
  for delete to authenticated
  using (autor_id = auth.uid() and tabla = 'bitacora_casos');

-- Grant base (NO retroactivo · fallo de 0020 corregido en 0021). Sin esto → 500.
grant select, insert, update, delete on lxp.anotaciones_dicom to authenticated;
grant all on lxp.anotaciones_dicom to service_role;
