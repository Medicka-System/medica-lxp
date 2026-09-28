-- ═══════════════════════════════════════════════════════════════════════════
-- 0057 · Perfil del alumno — imagen de portada (header · /perfil)
--
-- `avatar_url` ya existía (0001). Se agrega `portada_url` para la banda de la
-- portada del perfil. Ambas guardan una REF de object storage (`media/imagenes/…`,
-- el uploader público §2); la LECTURA se firma al render por el `api` (único
-- firmante S3), igual que el media del Ateneo.
--
-- Escritura del propio alumno bajo la policy `perfiles_update` existente
-- (user_id = auth.uid()); el GRANT UPDATE a nivel tabla cubre la columna nueva.
-- No hace falta policy ni grant adicional. NUNCA toca `public` (CORA · §10).
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.perfiles
  add column if not exists portada_url text;
