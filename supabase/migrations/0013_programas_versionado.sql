-- ═══════════════════════════════════════════════════════════════════════════
-- 0013 · Publicación con versionado del programa (§5B/§6 · Sprint 4.5)
--
-- Máquina de estados de publicación: borrador → revisión → publicado (+ archivado).
-- Al PUBLICAR se congela un SNAPSHOT inmutable del árbol (programa→módulos→
-- lecciones→contenidos/actividades/rúbricas) en `lxp.programa_versiones`, y un
-- BORRADOR no es visible para alumnos (RLS). La escritura de estados/versiones la
-- hace el dominio en `api` (service_role); el árbol de autoría lo escribe el
-- diseñador (es_autoria).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Estado de publicación del programa ──
create type lxp.estado_publicacion as enum (
  'borrador',   -- en edición; no visible para alumnos
  'revision',   -- enviado a revisión editorial
  'publicado',  -- vigente y visible para alumnos
  'archivado'   -- retirado de circulación
);

alter table lxp.programas
  add column if not exists estado lxp.estado_publicacion not null default 'borrador';

-- `publicado` (bool, ya existente · 0002) pasa a ser ESPEJO de `estado`: la fuente
-- de verdad es `estado`. El trigger lo mantiene sincronizado y, para no romper el
-- insert legacy del seed (que pone `publicado=true` sin `estado`), respeta esa
-- intención elevando el estado a 'publicado'.
create or replace function lxp.programas_sync_publicado()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.publicado and new.estado = 'borrador' then
    new.estado := 'publicado';
  end if;
  new.publicado := (new.estado = 'publicado');
  return new;
end
$$;

create trigger programas_sync_publicado
  before insert or update on lxp.programas
  for each row execute function lxp.programas_sync_publicado();

-- Alinea filas preexistentes (si las hubiera) con el nuevo modelo.
update lxp.programas set estado = 'publicado' where publicado = true;

-- ── Snapshots inmutables de cada versión publicada ──
create table lxp.programa_versiones (
  id            uuid primary key default gen_random_uuid(),
  programa_id   uuid not null references lxp.programas(id) on delete cascade,
  version       integer not null,
  -- Árbol congelado del programa al momento de publicar (jsonb).
  snapshot      jsonb not null,
  notas         text,
  publicado_por uuid references lxp.perfiles(user_id) on delete set null,
  publicado_en  timestamptz not null default now(),
  unique (programa_id, version)
);

create index programa_versiones_programa_idx
  on lxp.programa_versiones (programa_id, version desc);

-- ── Grants + RLS de la tabla nueva (0010 solo cubrió las tablas de entonces) ──
-- El historial lo LEE el staff; lo ESCRIBE el dominio con service_role (omite RLS).
grant select on lxp.programa_versiones to authenticated;
grant all on lxp.programa_versiones to service_role;

alter table lxp.programa_versiones enable row level security;

create policy programa_versiones_select on lxp.programa_versiones
  for select to authenticated using (lxp.es_staff());

-- ── RLS: un BORRADOR no es visible para alumnos (DoD Sprint 4.5) ──
-- Regla previa (0010): programas_read era `using (true)`. Ahora el alumno solo ve
-- programas PUBLICADOS; el staff ve todos (borradores/revisión incluidos).
-- NOTA (Sprint 9): endurecer también módulos/lecciones/contenidos por el estado de
-- su programa (hoy siguen `using(true)`; el catálogo entra por `programas`).
drop policy if exists programas_read on lxp.programas;
create policy programas_read on lxp.programas
  for select to authenticated
  using (estado = 'publicado' or lxp.es_staff());
