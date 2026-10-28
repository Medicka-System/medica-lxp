-- ═══════════════════════════════════════════════════════════════════════════
-- 0092 · Lección independizada por grupo — copy-on-write (Paso 2)
-- Campus Virtual LXP · Médica Capacitación
--
-- Editar un componente HEREDADO a nivel grupo = copy-on-write a filas reales con
-- grupo_id (reusa el course builder entero). Granularidad por LECCIÓN para los 6 tipos
-- de config (video/h5p/xapi/autoevaluación/tarea/foro); teoría copia también sus bloques.
--
-- `reemplaza_a` vincula la lección PROPIA (grupo_id not null) con la lección HEREDADA
-- (grupo_id NULL) que sustituye en ese grupo. Los consumidores (Studio + alumno)
-- SUPRIMEN la heredada cuando existe su reemplazo → el grupo ve la copia en su lugar,
-- sin duplicado. La fila heredada del PROGRAMA nunca se toca.
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.lecciones
  add column if not exists reemplaza_a uuid references lxp.lecciones(id) on delete set null;

comment on column lxp.lecciones.reemplaza_a is
  'Copy-on-write por grupo (Paso 2): la lección propia (grupo_id not null) reemplaza a esta '
  'lección heredada en el grupo. NULL = no es un reemplazo. ON DELETE SET NULL: si el programa '
  'borra la heredada, la copia queda como lección propia normal (territorio de re-sync · Paso 3).';

-- Solo una fila PROPIA puede reemplazar (coherencia con grupo_id).
alter table lxp.lecciones
  drop constraint if exists lecciones_reemplaza_solo_propio;
alter table lxp.lecciones
  add constraint lecciones_reemplaza_solo_propio
  check (reemplaza_a is null or grupo_id is not null);

-- Lookup del reemplazo (suprimir la heredada en el grupo).
create index if not exists lecciones_reemplaza_a_idx
  on lxp.lecciones (reemplaza_a) where reemplaza_a is not null;
