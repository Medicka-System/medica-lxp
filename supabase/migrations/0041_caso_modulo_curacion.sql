-- ═══════════════════════════════════════════════════════════════════════════
-- 0041 · Módulo del caso curado (§5B) — lo asigna el DOCENTE al curar
--
-- El dominio I-AIM y el órgano se auto-mapean del reporte/estudio (editables), pero
-- el MÓDULO no se adivina: adivinarlo por palabra clave atribuiría horas/competencia
-- al módulo equivocado. El docente —que sabe a qué módulo pertenece el caso— lo elige
-- de un dropdown en la curaduría. `casos_biblioteca` no tenía `modulo_id`; se agrega.
--
-- El puente bitácora→banco (§5B) PRE-LLENA este campo con el `modulo_id` del caso de
-- bitácora de origen (si lo tenía); el docente lo confirma o cambia. `on delete set
-- null`: si el módulo se borra, el caso no se pierde.
--
-- ADITIVO y SEED-SAFE: `add column if not exists`, nullable, sin default de datos.
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.casos_biblioteca
  add column if not exists modulo_id uuid references lxp.modulos(id) on delete set null;

comment on column lxp.casos_biblioteca.modulo_id is
  'Módulo al que el docente asigna el caso curado (§5B). Lo elige en la curaduría '
  '(dropdown de módulos de programas publicados); el puente bitácora→banco lo '
  'pre-llena con el módulo del caso de origen. null = sin asignar.';

create index if not exists casos_biblioteca_modulo_idx on lxp.casos_biblioteca (modulo_id);
