-- ═══════════════════════════════════════════════════════════════════════════
-- 0026 · Anclaje por LECCIÓN (Fase 0 · rediseño del constructor · §5B/§5C)
--
-- El modelo NUEVO (mig 0023) volvió la lección MONO-TIPO: su contenido vive en
-- `lxp.bloques` (teoría) o en `lxp.lecciones.config` (video/autoeval/tarea/foro/
-- h5p/xapi). Pero varias tablas de actividad del alumno todavía cuelgan del modelo
-- VIEJO (una `actividad`/`contenido` por lección):
--   · entregas.actividad_id            → una actividad tarea/autoeval
--   · reproduccion_progreso.contenido_id → un contenido reproducible
--   · foro_mensajes.actividad_id       → una actividad foro
--
-- Esta migración es ADITIVA y NO DESTRUCTIVA: añade una columna de anclaje directo
-- a la lección (`leccion_id`, nullable + FK + índice) a esas tres tablas y la
-- backfillea desde su ancla vieja. Las columnas viejas (`actividad_id`/
-- `contenido_id`) QUEDAN VIVAS: nada se dropea aquí. En una fase 3 posterior, con
-- todos los lectores re-cableados a `leccion_id`, se podrán dropear sin romper.
--
-- Seed-safe / idempotente:
--   · `add column if not exists` + FK con nombre estable (no re-crea si ya está).
--   · El backfill es un UPDATE ... WHERE leccion_id is null (re-correr no daña).
--   · No toca enums ni dropea nada.
--
-- RLS/grants: no se añaden policies nuevas. Las policies de las tres tablas (mig
-- 0010 entregas/foro_mensajes; 0017 reproduccion_progreso) gatean por columnas que
-- NO cambian (id_alumno / alumno_id / autor_id); la nueva columna queda cubierta
-- por esas mismas policies y por los grants de tabla ya concedidos (no son
-- column-level). No hace falta re-conceder (el grant on all NO retroactivo aplica a
-- tablas nuevas, no a columnas nuevas de tablas ya concedidas).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · entregas.leccion_id (ancla vieja: actividades.leccion_id) ──
alter table lxp.entregas
  add column if not exists leccion_id uuid references lxp.lecciones(id) on delete set null;

create index if not exists entregas_leccion_idx on lxp.entregas (leccion_id);

comment on column lxp.entregas.leccion_id is
  'Ancla DIRECTA a la lección (modelo nuevo · mig 0026). Antes se resolvía vía '
  'actividad_id → actividades.leccion_id (modelo viejo, aún vivo). Backfilleado; el '
  'nuevo constructor lo escribe al crear la entrega desde la lección tarea/autoeval.';

update lxp.entregas e
set leccion_id = a.leccion_id
from lxp.actividades a
where e.actividad_id = a.id and e.leccion_id is null;

-- ── 2 · reproduccion_progreso.leccion_id (ancla vieja: contenidos.leccion_id) ──
alter table lxp.reproduccion_progreso
  add column if not exists leccion_id uuid references lxp.lecciones(id) on delete set null;

create index if not exists reproduccion_progreso_leccion_idx
  on lxp.reproduccion_progreso (leccion_id);

comment on column lxp.reproduccion_progreso.leccion_id is
  'Ancla DIRECTA a la lección (modelo nuevo · mig 0026). Antes se resolvía vía '
  'contenido_id → contenidos.leccion_id (modelo viejo, aún vivo). Backfilleado; los '
  'players del modelo nuevo (video/h5p/xapi como LECCIÓN) lo escriben directo.';

update lxp.reproduccion_progreso rp
set leccion_id = co.leccion_id
from lxp.contenidos co
where rp.contenido_id = co.id and rp.leccion_id is null;

-- ── 3 · foro_mensajes.leccion_id (ancla vieja: actividades.leccion_id) ──
alter table lxp.foro_mensajes
  add column if not exists leccion_id uuid references lxp.lecciones(id) on delete set null;

create index if not exists foro_mensajes_leccion_idx
  on lxp.foro_mensajes (leccion_id, grupo_id);

comment on column lxp.foro_mensajes.leccion_id is
  'Ancla DIRECTA a la lección tipo foro (modelo nuevo · mig 0026). Antes se resolvía '
  'vía actividad_id → actividades.leccion_id (modelo viejo, aún vivo). Backfilleado; '
  'la config del foro vive en lecciones.config (§5C), no en la actividad de respaldo.';

update lxp.foro_mensajes fm
set leccion_id = a.leccion_id
from lxp.actividades a
where fm.actividad_id = a.id and fm.leccion_id is null;
