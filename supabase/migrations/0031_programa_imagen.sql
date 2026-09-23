-- ═══════════════════════════════════════════════════════════════════════════
-- 0031 · Imagen de portada del programa (curso) — home del alumno
--
-- El home ("Siga donde se quedó") muestra la portada del curso, no un video: hasta
-- ahora no existía el campo. Se agrega `imagen_url` al programa (la plantilla · fuente
-- de verdad del contenido). El diseñador la fija en el course builder; el alumno la ve
-- en el home y en el catálogo.
--
-- Seed-safe / idempotente: `add column if not exists`. Solo esquema `lxp`; jamás el
-- `public` de CORA (§10, regla 3). No cambia RLS (programas ya es legible por policy).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.programas
  add column if not exists imagen_url text;
