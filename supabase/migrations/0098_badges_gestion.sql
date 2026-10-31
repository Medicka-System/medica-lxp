-- ═══════════════════════════════════════════════════════════════════════════
-- 0098 · Gestión de badges: policies de ESCRITURA (catálogo + otorgamiento manual)
--
-- El MOTOR automático NO se toca: el worker `otorgar-badges` escribe con service_role
-- (bypassa RLS) y seguirá insertando `badges_otorgados` con otorgado_por = NULL. Esta
-- migración solo agrega la capa de GESTIÓN humana encima:
--   · Catálogo `lxp.badges`: lo administra la autoría (super_admin/admin · es_autoria),
--     mismo patrón `for all ... es_autoria()` que contenidos/rubricas (0010).
--   · `lxp.badges_otorgados`: OTORGAMIENTO MANUAL por el staff (docente/admin/super),
--     que inserta con `otorgado_por = auth.uid()` (quién lo dio). El staff solo puede
--     REVOCAR los manuales (otorgado_por not null); los automáticos (null) no se tocan
--     desde web (el worker los re-otorgaría de todos modos).
--
-- Grants: badges/badges_otorgados (creadas en 0006, ANTES de 0010) YA recibieron el
-- `grant ... on all tables` de 0010; se reafirma aquí por claridad (idempotente).
-- Las policies de SELECT (0010: badges_select true; badges_otorgados_select dueño/staff)
-- NO se tocan — conviven con estas por-comando (RLS combina permisivas con OR).
--
-- ⚠️ Solo esquema `lxp`; jamás `public`/`auth` de CORA (§10, regla 3). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Grants (reafirmados; 0010 ya los dio para estas tablas pre-existentes) ──
grant select, insert, update, delete on lxp.badges, lxp.badges_otorgados to authenticated;
grant all on lxp.badges, lxp.badges_otorgados to service_role;

-- ── Catálogo: escritura = autoría (super_admin/admin) ──
drop policy if exists badges_write on lxp.badges;
create policy badges_write on lxp.badges
  for all to authenticated
  using (lxp.es_autoria()) with check (lxp.es_autoria());

-- ── Otorgamiento MANUAL: el staff inserta marcándose como otorgante ──
-- `otorgado_por = auth.uid()` en el WITH CHECK impide que authenticated inserte filas
-- "automáticas" (null); el auto-otorgamiento sigue siendo exclusivo de service_role.
drop policy if exists badges_otorgados_insert_manual on lxp.badges_otorgados;
create policy badges_otorgados_insert_manual on lxp.badges_otorgados
  for insert to authenticated
  with check (lxp.es_staff() and otorgado_por = auth.uid());

-- ── Revocar MANUAL: solo los otorgados a mano (otorgado_por not null) ──
drop policy if exists badges_otorgados_delete_manual on lxp.badges_otorgados;
create policy badges_otorgados_delete_manual on lxp.badges_otorgados
  for delete to authenticated
  using (lxp.es_staff() and otorgado_por is not null);

-- ── ROLLBACK (manual) ──
-- drop policy if exists badges_write on lxp.badges;
-- drop policy if exists badges_otorgados_insert_manual on lxp.badges_otorgados;
-- drop policy if exists badges_otorgados_delete_manual on lxp.badges_otorgados;
