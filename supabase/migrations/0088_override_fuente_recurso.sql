-- ═══════════════════════════════════════════════════════════════════════════
-- 0088 · Override de FUENTE de recurso por grupo (modelo nuevo · §6 · Paso 4b)
-- Campus Virtual LXP · Médica Capacitación
--
-- El diseñador puede REEMPLAZAR el recurso de una lección SOLO para su grupo. El
-- contenido real vive en el modelo NUEVO:
--   · teoría           → lxp.bloques (por bloque · config.ref/src/videotecaId/imagenes)
--   · video (lección)  → lxp.lecciones.config (videotecaId/url)
-- Hasta ahora el motor trataba bloques/config como PASSTHROUGH (no personalizables).
-- Este cambio habilita dos entidades de override NUEVAS en `lxp.grupo_overrides`:
--   · 'bloque'          → entidad_id = lxp.bloques.id       (teoría: imagen/pdf/galería/video-bloque)
--   · 'leccion_config'  → entidad_id = lxp.lecciones.id     (video-lección · fuente en config)
--
-- Por qué entidad PROPIA para la fuente de lección (y no reusar 'leccion'): el índice
-- único es (grupo_id, entidad, entidad_id). Una lección puede tener a la vez un override
-- de ocultar/renombrar ('leccion') y uno de FUENTE; con la misma entidad colisionarían.
-- Por eso 'leccion_config' es independiente y convive con 'leccion'.
--
-- El override PERSISTE la fuente YA RESUELTA (ref/src/videotecaId/… — resolver-al-guardar,
-- Paso 4a), nunca un recursoId crudo. El alumno la ve por el canal existente (getLeccion
-- overlaya la fuente; el lector firma ref/reproduce videotecaId · Paso 1/4a).
--
-- Solo AMPLÍA el CHECK de una tabla que YA EXISTE (lxp.grupo_overrides): sus GRANT y RLS
-- (mig 0010/0012) siguen vigentes — NO hace falta GRANT nuevo. Aditivo; el caso sin estos
-- overrides es idéntico a hoy. ⚠️ Solo esquema `lxp`; jamás `public` de CORA (§10).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.grupo_overrides
  drop constraint if exists grupo_overrides_entidad_check;
alter table lxp.grupo_overrides
  add constraint grupo_overrides_entidad_check
  check (entidad in (
    'programa', 'modulo', 'leccion', 'contenido', 'actividad',
    'bloque', 'leccion_config'
  ));

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   alter table lxp.grupo_overrides drop constraint if exists grupo_overrides_entidad_check;
--   alter table lxp.grupo_overrides add constraint grupo_overrides_entidad_check
--     check (entidad in ('programa','modulo','leccion','contenido','actividad'));
-- ═══════════════════════════════════════════════════════════════════════════
