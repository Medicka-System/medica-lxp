-- ═══════════════════════════════════════════════════════════════════════════
-- 0096 · Historial de versiones del archivo de un recurso de biblioteca (§5B)
-- Campus Virtual LXP · Médica Capacitación
--
-- Reemplazar el archivo de un `lxp.recursos` hace `version + 1` pero antes NO guardaba
-- la versión anterior → el detalle solo mostraba la actual. Esta tabla acumula cada
-- versión SUPERADA (storage_key + meta de ese momento) para que el detalle muestre el
-- historial real y se pueda ver/descargar una versión previa.
--
-- Append-only: al reemplazar, el server action inserta aquí la fila con la versión que
-- SALE; la fila vigente sigue en `lxp.recursos`.
--
-- GRANT: tabla NUEVA → NO hereda el grant base de 0010 (regla del proyecto); se concede
-- explícito o `authenticated` recibe "permission denied" aunque la RLS permita.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists lxp.recursos_versiones (
  id          uuid primary key default gen_random_uuid(),
  recurso_id  uuid not null references lxp.recursos(id) on delete cascade,
  version     integer not null,
  storage_key text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  created_by  uuid references lxp.perfiles(user_id) on delete set null
);

create index if not exists recursos_versiones_recurso_idx
  on lxp.recursos_versiones (recurso_id, version desc);

-- GRANT explícito (tabla nueva).
grant select, insert, update, delete on lxp.recursos_versiones to authenticated;
grant all on lxp.recursos_versiones to service_role;

-- RLS como las demás tablas de contenido: staff LEE el historial, autoría ESCRIBE.
alter table lxp.recursos_versiones enable row level security;

drop policy if exists recursos_versiones_read on lxp.recursos_versiones;
create policy recursos_versiones_read on lxp.recursos_versiones
  for select to authenticated using (lxp.es_staff());

drop policy if exists recursos_versiones_write on lxp.recursos_versiones;
create policy recursos_versiones_write on lxp.recursos_versiones
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());
