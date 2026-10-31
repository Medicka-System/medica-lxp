-- ═══════════════════════════════════════════════════════════════════════════
-- 0097 · Eco · lectura de la telemetría de costo (lxp.eco_uso) para el staff
--
-- La tabla `lxp.eco_uso` (mig 0043) se ESCRIBE con service_role (telemetría por
-- llamada al LLM) pero nació con RLS activa SIN policy y SIN grant a `authenticated`
-- (0043:36-41). Resultado: el panel de costo del admin recibía `permission denied`.
-- Este paso ABRE la LECTURA agregada para el staff — sin tocar lo que ya escribe.
--
--   · GRANT select a `authenticated` (CRÍTICO: el `grant on all tables` de 0010 NO es
--     retroactivo, y 0043 no concedió nada; sin esto la policy no basta · §6/§10).
--   · Policy SELECT con `lxp.es_staff()` — MISMO patrón que `eco_config_select`
--     (0016:117-118) y el resto de tablas de staff. La UI de gasto está gateada a
--     admin/súper admin por su route-group; la RLS es el segundo candado.
--   · La ESCRITURA sigue siendo del `api`/worker con service_role (bypassa RLS). Se
--     reafirma `grant all` a service_role por consistencia (0018) — es aditivo, no
--     cambia el comportamiento de escritura.
--
-- ⚠️ Solo esquema `lxp`; jamás `public`/`auth` de CORA (§10, regla 3). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Grants (sin esto, la policy no concede acceso: permission denied) ──
grant select on lxp.eco_uso to authenticated;
grant all    on lxp.eco_uso to service_role;

-- ── RLS · eco_uso: lectura agregada del staff (patrón eco_config · 0016) ──
-- Solo lectura; la escritura la hace el api/worker con service_role (omite RLS).
drop policy if exists eco_uso_select on lxp.eco_uso;
create policy eco_uso_select on lxp.eco_uso
  for select to authenticated using (lxp.es_staff());

comment on table lxp.eco_uso is
  'Telemetria de costo de Eco (§7A): tokens (entrada/salida/cache) y costo por llamada '
  'al LLM. La escribe el api (service_role). LECTURA agregada para staff (mig 0097 · '
  'policy eco_uso_select + grant select a authenticated); el panel de costo del admin la usa.';

-- ── ROLLBACK (manual) ──
-- drop policy if exists eco_uso_select on lxp.eco_uso;
-- revoke select on lxp.eco_uso from authenticated;
