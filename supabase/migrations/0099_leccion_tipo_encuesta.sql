-- ═══════════════════════════════════════════════════════════════════════════
-- 0099 · Nuevo tipo de lección: `encuesta` (§5C)
--
-- Encuesta = constructor de varias preguntas que RECOGE respuestas del alumno, SIN
-- calificar (distinto de `autoevaluacion`, que sí evalúa). Vive junto a los 7 tipos.
--
-- ⚠️ `ALTER TYPE ... ADD VALUE` va SOLO en esta migración (no se usa el valor nuevo en
-- la misma operación). La tabla de respuestas y el resto van en 0100 (ya con el valor
-- comprometido). `IF NOT EXISTS` → idempotente. No toca nada más del enum ni de las tablas.
-- ═══════════════════════════════════════════════════════════════════════════

alter type lxp.leccion_tipo add value if not exists 'encuesta';
