-- ═══════════════════════════════════════════════════════════════════════════
-- 0030 · Foro de la lección — experiencia del alumno (§5C · mock leccion-foro)
--
-- Recablea el motor `foro_mensajes` (0003/0026) al flujo de 3 estados del alumno:
--   entrada  → aún no publicó: ve instrucciones + rúbrica + composer; los posts de
--              los compañeros están OCULTOS (gate por RLS, no solo UI).
--   listado  → publicó su post raíz → se DESBLOQUEAN los posts del grupo.
--   post     → interior con reacción ("me es útil") + hilo de 2 niveles + editar.
--
-- Cambios de modelo (seed-safe · idempotente):
--   1. `titulo` (post raíz) + `editado_en` en foro_mensajes.
--   2. GATE de desbloqueo en la policy de SELECT: el alumno solo ve posts ajenos si
--      ya publicó su propio post raíz en esa (actividad, grupo). Se resuelve con una
--      función SECURITY DEFINER para NO recursar sobre la RLS de la misma tabla.
--   3. UPDATE del propio autor (editar su post/comentario).
--   4. `foro_reacciones` ("me es útil") + RLS ligada a la visibilidad del mensaje.
--   5. `foro_ocultos()` — cuántos posts esperan (para el muro, sin revelar contenido).
--
-- Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3). Grants explícitos
-- (el `grant on all` de 0010 NO es retroactivo · lección de 0020/0021).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · columnas nuevas en foro_mensajes ──
alter table lxp.foro_mensajes
  add column if not exists titulo     text,
  add column if not exists editado_en timestamptz;

-- ── 2 · GATE de desbloqueo (SECURITY DEFINER · evita recursión de RLS) ──
-- ¿El alumno actual ya publicó su post raíz en esta (actividad, grupo)?
create or replace function lxp.foro_ya_publico(p_actividad uuid, p_grupo uuid)
returns boolean
language sql stable security definer set search_path = lxp as $$
  select exists (
    select 1 from lxp.foro_mensajes
    where actividad_id = p_actividad and grupo_id = p_grupo
      and autor_id = auth.uid() and parent_id is null
  );
$$;
grant execute on function lxp.foro_ya_publico(uuid, uuid) to authenticated, service_role;

-- Cuántos posts raíz de OTROS esperan (para "N compañeros ya publicaron", sin leerlos).
create or replace function lxp.foro_ocultos(p_actividad uuid, p_grupo uuid)
returns int
language sql stable security definer set search_path = lxp as $$
  select count(*)::int from lxp.foro_mensajes
  where actividad_id = p_actividad and grupo_id = p_grupo
    and parent_id is null and autor_id <> auth.uid();
$$;
grant execute on function lxp.foro_ocultos(uuid, uuid) to authenticated, service_role;

-- SELECT gateado: staff ve todo; el alumno ve lo suyo SIEMPRE y lo ajeno SOLO si ya
-- publicó su post raíz (por (actividad, grupo)). Reemplaza la policy abierta de 0010.
drop policy if exists foro_select on lxp.foro_mensajes;
create policy foro_select on lxp.foro_mensajes
  for select to authenticated
  using (
    lxp.es_staff()
    or autor_id = auth.uid()
    or lxp.foro_ya_publico(actividad_id, grupo_id)
  );

-- ── 3 · UPDATE del propio autor (editar) — marca editado_en desde la app ──
drop policy if exists foro_update on lxp.foro_mensajes;
create policy foro_update on lxp.foro_mensajes
  for update to authenticated
  using (autor_id = auth.uid() and lxp.acceso_activo())
  with check (autor_id = auth.uid());

-- ── 4 · reacciones "me es útil" (una por alumno y mensaje) ──
create table if not exists lxp.foro_reacciones (
  mensaje_id uuid not null references lxp.foro_mensajes(id) on delete cascade,
  autor_id   uuid not null references lxp.perfiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mensaje_id, autor_id)
);

alter table lxp.foro_reacciones enable row level security;

-- Ver la reacción solo si el mensaje es visible (la RLL de foro_mensajes aplica al
-- subselect → una reacción sobre un post oculto tampoco se cuenta).
drop policy if exists foro_reacciones_select on lxp.foro_reacciones;
create policy foro_reacciones_select on lxp.foro_reacciones
  for select to authenticated
  using (exists (select 1 from lxp.foro_mensajes m where m.id = mensaje_id));

drop policy if exists foro_reacciones_insert on lxp.foro_reacciones;
create policy foro_reacciones_insert on lxp.foro_reacciones
  for insert to authenticated
  with check (autor_id = auth.uid() and lxp.acceso_activo());

drop policy if exists foro_reacciones_delete on lxp.foro_reacciones;
create policy foro_reacciones_delete on lxp.foro_reacciones
  for delete to authenticated
  using (autor_id = auth.uid());

grant select, insert, delete on lxp.foro_reacciones to authenticated;
grant all on lxp.foro_reacciones to service_role;
