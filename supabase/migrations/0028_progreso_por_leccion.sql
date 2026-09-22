-- ═══════════════════════════════════════════════════════════════════════════
-- 0028 · Progreso de lección RE-LLAVEADO por leccion_id (modelo nuevo · §6/§7)
--
-- `lxp.reproduccion_progreso` nació clavado a `contenido_id` (modelo VIEJO ·
-- lxp.contenidos, mig 0017) con UNIQUE (alumno_id, contenido_id). Pero las lecciones
-- del modelo NUEVO (mig 0023: teoria/video/autoeval/tarea/foro/h5p/xapi) NO tienen
-- fila en `contenidos`, así que "marcar como completada" no persistía (el insert por
-- contenido no encontraba filas) → el avance se perdía al recargar y la palomita del
-- menú del curso nunca aparecía.
--
-- Esta migración permite una fila de progreso ANCLADA DIRECTO A LA LECCIÓN
-- (`contenido_id` NULL, `leccion_id` set) y le da unicidad por (alumno_id, leccion_id),
-- para que el upsert de completado funcione con TODOS los tipos.
--
-- Seed-safe / idempotente:
--   · `drop not null` sobre una columna ya nullable es no-op (no falla al re-correr).
--   · `create unique index if not exists`.
--   · No toca enums, RLS ni grants (las policies de la tabla gatean por alumno_id +
--     acceso_activo y cubren la fila leccion-keyed; los grants ya están concedidos).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- Una fila leccion-keyed no tiene contenido: se permite NULL en contenido_id.
alter table lxp.reproduccion_progreso alter column contenido_id drop not null;

-- Unicidad de la fila ANCLADA A LA LECCIÓN (contenido_id NULL). El índice es PARCIAL
-- para NO chocar con las filas por contenido (que tienen contenido_id set + su propio
-- UNIQUE, y su leccion_id backfilleado por 0026): esas quedan fuera del índice.
create unique index if not exists reproduccion_progreso_alumno_leccion_key
  on lxp.reproduccion_progreso (alumno_id, leccion_id)
  where contenido_id is null and leccion_id is not null;

comment on index lxp.reproduccion_progreso_alumno_leccion_key is
  'Upsert del progreso ANCLADO A LA LECCIÓN (modelo nuevo · mig 0028): una fila por '
  '(alumno, lección) SIN contenido_id, para los tipos sin fila en lxp.contenidos.';
