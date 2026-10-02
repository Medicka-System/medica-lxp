-- ═══════════════════════════════════════════════════════════════════════════
-- 0065 · Mínimo privilegio en EXECUTE de funciones (L-2/L-3 · auditoría RLS)
-- Campus Virtual LXP · Médica Capacitación
--
-- L-2: helpers SECURITY DEFINER que NO son ruta anon → se quita EXECUTE a `anon`
--      (defensa en profundidad). `verificar_folio_publico` SÍ es ruta anon legítima y
--      se CONSERVA (no se toca). Los definers corren como owner por dentro, así que
--      quitarle execute a anon no afecta lo que hacen internamente.
-- L-3: funciones TRIGGER con EXECUTE por default a PUBLIC → se quita a `public`. Los
--      triggers se invocan por el motor (no se chequea EXECUTE del invocador) → revoke
--      NO rompe el trigger; solo cierra la llamada directa `select fn()`.
-- authenticated/service_role conservan lo que necesitan. Solo esquema `lxp` (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- L-2 · helpers no-anon
revoke execute on function
  lxp.nombre_de(uuid),
  lxp.es_staff(), lxp.es_docente_o_mas(), lxp.es_autoria(),
  lxp.rol_actual(), lxp.acceso_activo(),
  lxp.cora_usuario(uuid), lxp.cora_acceso_activo(uuid), lxp.cora_grupos_de(uuid),
  lxp.cora_alumnos_de_grupo(uuid), lxp.cora_conteo_alumnos()
from anon;

-- L-3 · funciones trigger (no deben ser invocables directamente por PUBLIC)
revoke execute on function
  lxp.recalcular_upvotes(), lxp.programas_sync_publicado(),
  lxp.recalc_horas_modulo(), lxp.touch_updated_at()
from public;
