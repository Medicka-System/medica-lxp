-- ═══════════════════════════════════════════════════════════════════════════
-- 0071 · acceso_activo() EN VIVO — fuente única gate + RLS (fix Fase 3a · FAIL 1)
-- Campus Virtual LXP · Médica Capacitación
--
-- El gate de sesión ya lee el acceso EN VIVO desde CORA (apps/web/lib/db.server.ts ·
-- accesoActivoEnVivo → cora_acceso_activo), pero la RLS seguía usando el flag PERSISTIDO
-- `lxp.perfiles.acceso_activo`, que queda STALE cuando CORA cambia la inscripción. Un
-- alumno con pago activo pero flag no-sincronizado pasaba el gate pero la RLS le negaba
-- ver/crear su propia práctica (bitacora_select y todas las policies que llaman
-- acceso_activo()).
--
-- FIX: `lxp.acceso_activo()` delega en `lxp.cora_acceso_activo(auth.uid())` (puente en
-- vivo contra CORA · 0009). Fuente única de verdad. NO se tocan las policies que la
-- llaman (misma firma, misma semántica booleana); solo cambia la implementación.
--
-- STABLE + SECURITY DEFINER (igual que cora_acceso_activo): el planner la evalúa como
-- función estable (no se re-planifica por fila); con el `AND` de las policies, además
-- solo se evalúa para las filas que ya casan por propiedad (corto-circuito). Maneja
-- `auth.uid()` NULL → false. Solo esquema `lxp`; jamás public/auth (§10).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.acceso_activo()
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select case
    when auth.uid() is null then false
    else lxp.cora_acceso_activo(auth.uid())
  end;
$$;
