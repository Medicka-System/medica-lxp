-- ═══════════════════════════════════════════════════════════════════════════
-- 0075 · Ateneo — REACCIONES a nivel COMENTARIO (paridad con el post)
-- Campus Virtual LXP · Médica Capacitación
--
-- El Ateneo ya tiene reacciones de 6 tipos a nivel POST (`lxp.reacciones_ateneo`
-- · mig 0032). Esta migración agrega la MISMA mecánica a nivel COMENTARIO, en una
-- tabla DEDICADA (NO se mete `comentario_id` dentro de `reacciones_ateneo`): una
-- reacción por (comentario, usuario), cambiable, con los 6 tipos clínicos del
-- enum existente `lxp.reaccion_ateneo_tipo` (reusado, no se crea otro).
--
-- Visibilidad: una reacción a un comentario es visible/insertable bajo el MISMO
-- scope que el comentario — que a su vez HEREDA la visibilidad del post (mig 0033:
-- `comentarios_ateneo_select` = "ves el comentario si ves el post"). Lo logramos
-- apoyándonos en la RLS de `lxp.comentarios_ateneo` desde una subconsulta
-- (`exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id)`):
-- esa subconsulta corre bajo la RLS del lector, así que devuelve TRUE solo si el
-- comentario le es visible. Es el MISMO patrón que 0033 usa para los comentarios.
--
-- ⚠️ Lección de la 0074 (NO repetir la trampa): la policy SELECT de ESTA tabla
-- NO hace un SELF-SELECT sobre `reacciones_comentario` (que bloquearía la fila
-- recién insertada), sino una subconsulta a OTRA tabla (`comentarios_ateneo`).
-- Además, la server action inserta con `ON CONFLICT … DO UPDATE` SIN `RETURNING`,
-- de modo que Postgres nunca evalúa la policy SELECT sobre la fila nueva.
--
-- Solo esquema `lxp`; jamás `public` de CORA (§10). Grants explícitos (no
-- retroactivos · como 0032). Aditiva: solo CREA una tabla nueva, no altera nada.
-- Rollback = drop de la tabla (cae su índice y sus policies por dependencia).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabla: una reacción por (comentario, usuario), cambiable ──
create table if not exists lxp.reacciones_comentario (
  comentario_id uuid not null references lxp.comentarios_ateneo(id) on delete cascade,
  usuario_id    uuid not null references lxp.perfiles(user_id) on delete cascade,
  tipo          lxp.reaccion_ateneo_tipo not null,
  created_at    timestamptz not null default now(),
  primary key (comentario_id, usuario_id)
);
create index if not exists reacciones_comentario_comentario_idx
  on lxp.reacciones_comentario (comentario_id);

alter table lxp.reacciones_comentario enable row level security;

-- SELECT: ve la reacción si PUEDE VER el comentario. La subconsulta a
-- `comentarios_ateneo` corre bajo su RLS (hereda post-visibility, mig 0033) → no
-- duplicamos la lógica de visibilidad. INLINE sobre OTRA tabla, sin self-select (0074).
drop policy if exists reacciones_comentario_select on lxp.reacciones_comentario;
create policy reacciones_comentario_select on lxp.reacciones_comentario
  for select to authenticated
  using (
    exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id)
  );

-- INSERT: a nombre propio, con acceso activo, y solo sobre un comentario visible.
drop policy if exists reacciones_comentario_ins on lxp.reacciones_comentario;
create policy reacciones_comentario_ins on lxp.reacciones_comentario
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and lxp.acceso_activo()
    and exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id)
  );

-- UPDATE: cambiar el tipo de MI reacción (lo usa ON CONFLICT DO UPDATE).
drop policy if exists reacciones_comentario_upd on lxp.reacciones_comentario;
create policy reacciones_comentario_upd on lxp.reacciones_comentario
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- DELETE: retirar MI reacción (toggle).
drop policy if exists reacciones_comentario_del on lxp.reacciones_comentario;
create policy reacciones_comentario_del on lxp.reacciones_comentario
  for delete to authenticated
  using (usuario_id = auth.uid());

grant select, insert, update, delete on lxp.reacciones_comentario to authenticated;
grant all on lxp.reacciones_comentario to service_role;
