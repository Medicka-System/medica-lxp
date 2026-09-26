-- ─────────────────────────────────────────────────────────────────────────────
-- 0047 · Backfill: repara `plantillas_reporte.estructura` doble-codificada (§6.5)
-- ─────────────────────────────────────────────────────────────────────────────
-- Un writer previo guardaba la estructura con `JSON.stringify(x)::jsonb`, que postgres.js
-- reserializa → la columna quedaba como TEXTO JSON (jsonb_typeof = 'string') en vez de objeto,
-- y el editor no veía secciones/campos. La escritura ya se corrigió (sql.json) y el lector
-- auto-sana; esto repara las filas YA guardadas mal.
--
-- Idempotente: solo toca las filas donde el jsonb es un string (`#>> '{}'` extrae el texto
-- interno y se recasta a jsonb → objeto). NO toca `lxp.reportes` (sus datos ya están intactos).
update lxp.plantillas_reporte
set estructura = (estructura #>> '{}')::jsonb
where jsonb_typeof(estructura) = 'string';
