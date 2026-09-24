-- ═══════════════════════════════════════════════════════════════════════════
-- 0042 · BIBLIOTECA DE CONTENIDO reutilizable (lxp.recursos · §5B/§5C)
-- (renumerada 0041→0042 al consolidar: casos-funcional tomó la 0041
--  [0041_caso_modulo_curacion]; se mantiene numeración secuencial)
--
-- El acervo de recursos que se suben UNA vez y N lecciones REFERENCIAN (no copian):
-- video, H5P, SCORM, xAPI, PDF, Word, PowerPoint, imagen. DICOM y casos clínicos NO
-- viven aquí (viven en Casos · lxp.casos_biblioteca / lxp.bitacora_casos).
--
-- Contrato en apps/web/lib/studio/contenido-contrato.ts. Hasta ahora la vista degradaba
-- con "pendiente de DB/API"; esta migración crea la tabla y el reader deja de degradar.
--
-- "Dónde se usa": la referencia REAL desde una lección de teoría vive en
-- `lxp.bloques.config->>'recursoId'` (lo escribe el "Insertar recurso" del constructor
-- de teoría · selector-recurso.tsx). No se toca `lxp.contenidos` (modelo viejo). El
-- conteo se calcula en el reader (datos.ts) contra `lxp.bloques`.
--
-- Seed-safe:
--   · enum vía guard `do $$ … if not exists`.
--   · `create table if not exists` + `create index if not exists`.
--   · No altera tablas existentes ⇒ el seed previo (mig 0002+) queda intacto.
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Enum de los 8 tipos de recurso (§5C) ──
do $$
begin
  if not exists (select 1 from pg_type t
                 join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'recurso_tipo' and n.nspname = 'lxp') then
    create type lxp.recurso_tipo as enum (
      'video', 'h5p', 'scorm', 'xapi', 'pdf', 'word', 'ppt', 'imagen'
    );
  end if;
end $$;

-- ── 2 · Tabla del acervo ──
-- `storage_key` apunta al binario en object storage / al id del artefacto según tipo:
--   · video      → id de videoteca (lxp.videoteca.id · se firma /media/videos/:id/reproducir)
--   · imagen     → clave media/imagenes/… (se firma /media/imagenes/firmar-lectura)
--   · pdf|word|ppt→ clave media/archivos/… (se firma /media/archivos/firmar-lectura)
--   · scorm|xapi → id de lxp.contenidos del paquete ingerido (/paquetes)
--   · h5p        → contentId del H5P server
-- `meta` guarda lo descriptivo (duración/resolución/páginas/peso…) que la tarjeta muestra.
create table if not exists lxp.recursos (
  id           uuid primary key default gen_random_uuid(),
  tipo         lxp.recurso_tipo not null,
  nombre       text not null,
  storage_key  text,
  meta         jsonb not null default '{}'::jsonb,
  reproduccion text,                                 -- 'Cloudflare Stream' | 'Reporta progreso' | …
  etiquetas    text[] not null default '{}',
  version      integer not null default 1,
  procesando   boolean not null default false,       -- video transcodificando, etc.
  progreso     integer,                               -- % de procesamiento
  created_by   uuid references lxp.perfiles(user_id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists recursos_tipo_idx on lxp.recursos (tipo, created_at desc);

-- Idempotente (seed-safe): `create trigger` no admite `if not exists`, así que se dropea
-- primero — cubre re-aplicar la migración (p.ej. tras renumerar 0041→0042).
drop trigger if exists recursos_touch on lxp.recursos;
create trigger recursos_touch
  before update on lxp.recursos
  for each row execute function lxp.touch_updated_at();

comment on table lxp.recursos is
  'Biblioteca de Contenido reutilizable (§5B · mig 0041): un recurso se sube una vez y '
  'las lecciones lo REFERENCIAN (lxp.bloques.config.recursoId), no lo copian. DICOM/casos '
  'clínicos NO van aquí (viven en Casos).';

-- ── 3 · Grants (el `grant on all tables` de 0010 NO es retroactivo · §6/§10) ──
grant select, insert, update, delete on lxp.recursos to authenticated;
grant all on lxp.recursos to service_role;

-- ── 4 · RLS · lectura authenticated + escritura es_autoria (mismo patrón que
-- bloques/contenidos · 0010/0023). El alumno LEE (renderiza el recurso en la lección);
-- solo autoría (diseñador/admin · §5B) sube/edita/borra en la biblioteca. ──
alter table lxp.recursos enable row level security;

-- Idempotente (seed-safe): `create policy` no admite `if not exists` en PG15.
drop policy if exists recursos_read on lxp.recursos;
create policy recursos_read on lxp.recursos
  for select to authenticated using (true);
drop policy if exists recursos_write on lxp.recursos;
create policy recursos_write on lxp.recursos
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());
