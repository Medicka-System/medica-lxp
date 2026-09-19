-- ═══════════════════════════════════════════════════════════════════════════
-- 0021 · Fix de grants faltantes en notificaciones (defecto de 0020)
--
-- 0020 creó las RLS policies de `lxp.notificaciones` y `lxp.preferencias_
-- notificaciones` y un `revoke insert, delete ... from authenticated`, PERO nunca
-- emitió el `grant` base a `authenticated` (el `grant on all tables` de 0010 no es
-- retroactivo · ver nota en 0017). Sin privilegio de tabla, la RLS no aplica y
-- Postgres devuelve "permission denied for table notificaciones" → el shell del
-- campus (campana) tumbaba TODAS las rutas del alumno con 500.
--
-- Los privilegios se derivan de las policies ya existentes en 0020:
--   · notificaciones             → SELECT (propias/staff) + UPDATE (marcar leída).
--                                   NO insert/delete: las escribe el worker/api con
--                                   service_role (in-app).
--   · preferencias_notificaciones → SELECT + INSERT + UPDATE (el alumno gestiona
--                                    sus preferencias).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- Notificaciones: el alumno LEE las suyas y las marca como leídas (no inserta/borra).
grant select, update on lxp.notificaciones to authenticated;

-- Preferencias: el alumno lee/crea/edita las suyas.
grant select, insert, update on lxp.preferencias_notificaciones to authenticated;

-- El worker/api (service_role) escribe las notificaciones y puede todo (bypassa RLS
-- pero igual necesita el grant de tabla).
grant all on lxp.notificaciones, lxp.preferencias_notificaciones to service_role;
