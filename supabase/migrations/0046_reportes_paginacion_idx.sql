-- ─────────────────────────────────────────────────────────────────────────────
-- 0046 · Índice para la paginación server-side de "Mis reportes" (§6.5)
-- ─────────────────────────────────────────────────────────────────────────────
-- El listado se pagina en el servidor (LIMIT/OFFSET) filtrando por dueño y ordenando
-- por `created_at DESC` (orden estable con desempate por `id`). A escala (cientos de
-- alumnos × cientos/miles de reportes por usuario) el índice compuesto
-- (id_medico, created_at DESC) hace que el filtro por dueño + orden + página sean rápidos
-- (index scan, sin sort ni seq scan). El índice antiguo `reportes_medico_idx` (solo
-- id_medico) queda CUBIERTO por este compuesto (mismo prefijo), pero no lo borramos para
-- no tocar otras rutas que puedan asumirlo.
--
-- Idempotente: `if not exists`.
create index if not exists reportes_medico_creado_idx
  on lxp.reportes (id_medico, created_at desc, id desc);
