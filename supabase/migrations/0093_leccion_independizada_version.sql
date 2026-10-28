-- ═══════════════════════════════════════════════════════════════════════════
-- 0093 · Versión del programa al independizar — aviso de desfase (Paso 3)
-- Campus Virtual LXP · Médica Capacitación
--
-- Una lección independizada (copy-on-write · reemplaza_a · mig 0092) se congela sobre la
-- versión del programa que tenía al copiarse. Si el programa AVANZA de versión, la copia
-- queda DESFASADA: el grupo dejó de recibir correcciones en esa lección. El Studio lo avisa
-- y ofrece "volver a heredar" (descartar la copia → reaparece la heredada actual).
--
-- Mismo criterio que el desfase de los overrides (`grupo_overrides.aplicado_sobre_version`).
-- NULL fuera de las copias (lecciones normales no lo usan).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.lecciones
  add column if not exists independizada_sobre_version integer;

comment on column lxp.lecciones.independizada_sobre_version is
  'Copy-on-write (Paso 3): versión del programa cuando se independizó esta lección (reemplaza_a '
  'not null). Si lxp.programas.version avanza por encima, la copia está DESFASADA → aviso '
  '"volver a heredar". NULL en lecciones que no son copias.';
