-- ═══════════════════════════════════════════════════════════════════════════
-- 0079 · Ateneo — Compartir (repost estilo Facebook) · post_compartido_id (§1/§6)
-- Campus Virtual LXP · Médica Capacitación
--
-- COMPARTIR = un POST NUEVO del usuario que EMBEBE el original ("[Tú] compartió
-- el post de [Autor]") + comentario propio opcional. La visibilidad del reshare la
-- elige quien comparte (todos/grupo/colegas), INDEPENDIENTE del original. Siempre
-- apunta al ORIGINAL (sin cadenas de reshare-de-reshare · anti-cadena en el server
-- con COALESCE(post_compartido_id, id)).
--
-- Esta migración es ADITIVA y SOLO toca el esquema `lxp`:
--   • `post_compartido_id uuid` AUTORREFERENCIAL → lxp.posts_ateneo(id) ON DELETE
--     SET NULL (mismo patrón que `caso_origen_id` · 0015): si el original se borra,
--     el reshare queda con la referencia en NULL → el front muestra "no disponible".
--
-- NO se toca `posts_ateneo_select` (0074): el reshare es un post NORMAL con su propia
-- `visibilidad`; la policy ya lo filtra por fila sin cambios. El embed del original se
-- resuelve server-side BAJO la RLS del viewer (si no lo ve → "no disponible").
--
-- El CONTADOR de compartidos es DERIVADO (COUNT de reshares que apuntan al post), no
-- un entero denormalizado — por eso aquí NO se agrega ni mantiene columna de conteo
-- (la vieja `compartidos` de 0032 queda vestigial; el feed la ignora y cuenta en vivo).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.posts_ateneo
  add column if not exists post_compartido_id uuid
    references lxp.posts_ateneo(id) on delete set null;

comment on column lxp.posts_ateneo.post_compartido_id is
  'Post del Ateneo que este reshare EMBEBE (Compartir · repost). Siempre apunta al '
  'ORIGINAL raíz (anti-cadena: el server usa COALESCE(post_compartido_id, id)). '
  'ON DELETE SET NULL → original borrado = "no disponible". null = post normal (no reshare).';

-- El feed cuenta los reshares de un post (contador derivado) y resuelve el original
-- de cada reshare → un índice parcial sobre la columna acelera ambos accesos.
create index if not exists posts_ateneo_post_compartido_idx
  on lxp.posts_ateneo (post_compartido_id)
  where post_compartido_id is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- ROLLBACK (manual):
--   drop index if exists lxp.posts_ateneo_post_compartido_idx;
--   alter table lxp.posts_ateneo drop column if exists post_compartido_id;
-- ───────────────────────────────────────────────────────────────────────────
