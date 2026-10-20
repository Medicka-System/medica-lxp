-- ═══════════════════════════════════════════════════════════════════════════
-- 0085 · Galería de imágenes de reporte: TABLA fuente de verdad + backfill (§6.5/§10)
-- Campus Virtual LXP · Médica Capacitación
--
-- FASE b (unificación del uploader de Reportes sobre el pipeline async). Hoy las imágenes
-- de la galería del reporte viven como una lista `{ref,ext,pie}[]` dentro de
-- `lxp.reportes.contenido->'valores'->{campoId}`. Esa lista NO tiene estado de pipeline
-- (procesando/cuarentena/…) ni ancla para thumb/derivados → la redacción corría síncrona en
-- el `api` (lenta, sin thumb) y el contrato del redactor driftó (JPG roto).
--
-- Esta migración crea `lxp.reporte_imagenes` como FUENTE DE VERDAD por imagen: estado del
-- pipeline (§10), `thumb_ref` (JPEG del frame YA redactado) y `derivados` (webp responsivos).
-- El worker async la escribe por imagen (idempotente por id); la UI sondea por
-- `(reporte_id, campo_id)`. El campo JSON de la galería queda como MARCADOR del campo (la
-- lista deja de ser el almacén) — pero esta migración es ADITIVA: NO toca `contenido`, para
-- que el swap de lectores (fase b3) sea reversible. El backfill materializa lo existente.
--
-- Solo esquema `lxp` · CERO DDL en `public` (CORA, §10). RLS espeja la propiedad de
-- `lxp.reportes` (dueño o staff); la escritura es del worker/api (service_role), como
-- `competencia_dominios`.
-- ═══════════════════════════════════════════════════════════════════════════

-- Estado del pipeline por imagen (§10). `cuarentena` = fail-closed del redactor
-- (`X-Revision-Manual: 1`): NO se publica, queda a revisión humana. `error` = fallo duro.
create type lxp.estado_imagen_reporte as enum
  ('recibido', 'procesando', 'listo', 'cuarentena', 'error');

create table lxp.reporte_imagenes (
  id         uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references lxp.reportes(id) on delete cascade,
  -- Campo galería dentro de la plantilla del reporte (una plantilla puede tener varias galerías).
  campo_id   text not null,
  -- Clave de la imagen REDACTADA (§10): `reportes/imagenes/{reporteId}/{id}.{ext}`.
  ref        text not null,
  ext        text not null default 'jpg',
  estado     lxp.estado_imagen_reporte not null default 'recibido',
  -- JPEG del primer frame YA redactado (§10) — `reportes/imagenes/{reporteId}/{id}/thumb.jpg`;
  -- null = sin thumb (placeholder). Para `.dcm` evita rasterizar en cliente la miniatura.
  thumb_ref  text,
  -- Derivados webp responsivos (solo JPG/PNG): {"640":ref,"1080":ref,"1600":ref}. null = sin derivados.
  derivados  jsonb,
  -- Orden dentro del campo (la galería es reordenable).
  orden      int not null default 0,
  -- Pie/caption opcional.
  pie        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reporte_imagenes_reporte_idx on lxp.reporte_imagenes (reporte_id);
-- Sondeo de la UI y lectura ordenada por campo galería.
create index reporte_imagenes_campo_idx on lxp.reporte_imagenes (reporte_id, campo_id, orden);

create trigger reporte_imagenes_touch
  before update on lxp.reporte_imagenes
  for each row execute function lxp.touch_updated_at();

-- ── RLS: espeja la propiedad de `lxp.reportes` (dueño o staff) en SELECT. La escritura
--    (insert/update/delete) es del worker/api con service_role (bypassa RLS) — como
--    `competencia_dominios`: read-only desde web. Sin políticas de escritura para
--    `authenticated` → el cliente no puede marcar 'listo' una imagen en cuarentena (§10). ──
alter table lxp.reporte_imagenes enable row level security;

create policy reporte_imagenes_select on lxp.reporte_imagenes
  for select to authenticated
  using (
    exists (
      select 1 from lxp.reportes r
      where r.id = reporte_id
        and (r.id_medico = auth.uid() or lxp.es_staff())
    )
  );

revoke all on lxp.reporte_imagenes from public;
grant select on lxp.reporte_imagenes to authenticated;
grant all on lxp.reporte_imagenes to service_role;

-- ── BACKFILL: materializa las imágenes que hoy viven en `contenido.valores[campoId]` a filas.
--    Soporta el valor directo `[...]` y el envoltorio `{"imagenes":[...]}` (ambos los lee
--    `leerGaleria`). Conserva el ORDEN (ordinality) y el `pie`. estado='listo' (ya existen
--    redactadas y referenciadas). Un valor que NO sea array-de-objetos-con-`ref` (tablas,
--    multiselección, strings) se EXCLUYE por el filtro → solo entran galerías reales.
--    ADITIVO: `contenido` NO se modifica (el swap de lectores es la fase b3). ──
insert into lxp.reporte_imagenes (reporte_id, campo_id, ref, ext, estado, orden, pie)
select r.id,
       campo.key,
       e.img->>'ref',
       coalesce(nullif(e.img->>'ext', ''), 'jpg'),
       'listo'::lxp.estado_imagen_reporte,
       (e.img_ord - 1)::int,
       nullif(e.img->>'pie', '')
from lxp.reportes r
  cross join lateral jsonb_each(coalesce(r.contenido->'valores', '{}'::jsonb)) as campo(key, val)
  cross join lateral (
    select case
      when jsonb_typeof(campo.val) = 'array' then campo.val
      when jsonb_typeof(campo.val) = 'object' and jsonb_typeof(campo.val->'imagenes') = 'array'
        then campo.val->'imagenes'
      else '[]'::jsonb
    end as arr
  ) as norm
  cross join lateral jsonb_array_elements(norm.arr) with ordinality as e(img, img_ord)
where jsonb_typeof(e.img) = 'object'
  and nullif(e.img->>'ref', '') is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- ROLLBACK (manual):
--   drop table if exists lxp.reporte_imagenes;
--   drop type if exists lxp.estado_imagen_reporte;
-- ───────────────────────────────────────────────────────────────────────────
