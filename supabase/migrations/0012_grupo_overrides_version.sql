-- ═══════════════════════════════════════════════════════════════════════════
-- 0012 · Herencia programa→grupo: sello de versión en overrides (§6 · Sprint 4.5)
--
-- El grupo hereda la plantilla del programa; `grupo_overrides` guarda las
-- personalizaciones puntuales. Este cambio sella la VERSIÓN del programa vigente
-- cuando se creó cada override, para poder avisar de RE-SINCRONIZACIÓN cuando la
-- plantilla avanza (§SPRINTS 4.5, paso 2).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- Versión del programa (lxp.programas.version) vigente al crear el override.
alter table lxp.grupo_overrides
  add column if not exists aplicado_sobre_version integer not null default 1;

comment on column lxp.grupo_overrides.aplicado_sobre_version is
  'Versión de la plantilla (lxp.programas.version) vigente cuando se aplicó el '
  'override. Si el programa avanza de versión, el override puede requerir revisión '
  '(aviso de re-sincronización).';

-- La entidad personalizada debe ser una del árbol de la plantilla.
alter table lxp.grupo_overrides
  drop constraint if exists grupo_overrides_entidad_check;
alter table lxp.grupo_overrides
  add constraint grupo_overrides_entidad_check
  check (entidad in ('programa', 'modulo', 'leccion', 'contenido', 'actividad'));

-- Un override por (grupo, entidad, entidad_id): re-aplicar reemplaza el patch,
-- no acumula filas (habilita el upsert del servicio de dominio).
create unique index if not exists grupo_overrides_unico_idx
  on lxp.grupo_overrides (grupo_id, entidad, entidad_id);
