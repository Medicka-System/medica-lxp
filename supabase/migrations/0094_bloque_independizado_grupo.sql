-- ═══════════════════════════════════════════════════════════════════════════
-- 0094 · Bloque de teoría independizado por grupo — copy-on-write POR BLOQUE (Paso 4)
-- Campus Virtual LXP · Médica Capacitación
--
-- Para TEORÍA la unidad de copy-on-write es el BLOQUE, no la lección: editar un bloque
-- heredado solo bifurca ESE bloque (grupo_id + reemplaza_a); el resto de la lección sigue
-- heredando correcciones del programa y el leccion_id NO cambia (progreso intacto).
--
-- Mismo patrón que `lecciones.reemplaza_a` (mig 0092): la fila PROPIA apunta al bloque
-- HEREDADO (grupo_id NULL) que sustituye en ese grupo. El motor (@campus/shared) y el lector
-- del alumno (getLeccion) SUPRIMEN el heredado donde hay copia y muestran la copia en su lugar.
-- Un bloque propio NUEVO (reemplaza_a NULL) se sigue INSERTANDO aditivo, como hoy.
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.bloques
  add column if not exists reemplaza_a uuid references lxp.bloques(id) on delete set null;

comment on column lxp.bloques.reemplaza_a is
  'Copy-on-write por bloque (Paso 4): el bloque propio (grupo_id not null) reemplaza a este '
  'bloque heredado en el grupo. NULL = bloque propio aditivo (o heredado). ON DELETE SET NULL: '
  'si el programa borra el heredado, la copia queda como bloque propio normal (re-sync).';

-- Solo una fila PROPIA puede reemplazar (coherencia con grupo_id).
alter table lxp.bloques
  drop constraint if exists bloques_reemplaza_solo_propio;
alter table lxp.bloques
  add constraint bloques_reemplaza_solo_propio
  check (reemplaza_a is null or grupo_id is not null);

-- Lookup del reemplazo (suprimir el heredado en el grupo).
create index if not exists bloques_reemplaza_a_idx
  on lxp.bloques (reemplaza_a) where reemplaza_a is not null;
