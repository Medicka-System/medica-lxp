-- 0050 · Validación docente en tiempo real (§5B): marca "visto por el docente" por caso.
--
-- El puntito verde de "caso nuevo/sin analizar" en la bandeja de validación se apaga cuando el
-- docente ABRE el caso. Necesita un flag por caso. Vive SOLO en el esquema `lxp` (§10 · cero DDL
-- sobre `public`); no toca RLS (las policies de bitacora_casos ya cubren staff/alumno).
--
-- Semántica: `false` = el docente aún no lo ha abierto (nuevo → puntito verde). Un caso NUEVO se
-- inserta con el default `false`. Los casos EXISTENTES no son "nuevos" respecto a esta feature →
-- se marcan como vistos en el backfill para no inundar la bandeja de puntitos verdes.

alter table lxp.bitacora_casos
  add column if not exists visto_docente boolean not null default false;

-- Backfill: todo lo que ya existía se considera visto (no es una llegada nueva).
update lxp.bitacora_casos set visto_docente = true where visto_docente = false;
