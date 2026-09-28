-- ═══════════════════════════════════════════════════════════════════════════
-- 0057 · Ateneo — snapshot de previsualización de ENLACE (OpenGraph) en el post
--
-- Al pegar un link en el composer, el `api` hace el unfurl server-side (con guard
-- SSRF) y el post GUARDA el snapshot {url,titulo,descripcion,imagen,sitio}. Se
-- persiste una sola vez al publicar (NO se re-fetchea en lectura → sin SSRF en el
-- render y estable si el link cambia). Campo propio, aparte de `media`/`temas`.
--
-- Aditiva y SEED-SAFE: columna jsonb nullable (null = post sin tarjeta de enlace).
-- Solo esquema `lxp`; jamás `public` de CORA (§10). La RLS y los grants de
-- posts_ateneo ya existen (0005/0032) y cubren la nueva columna.
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.posts_ateneo
  add column if not exists enlace jsonb;   -- {url,titulo,descripcion,imagen,sitio} | null
