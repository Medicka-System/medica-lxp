-- ═══════════════════════════════════════════════════════════════════════════
-- 0040 · Puente bitácora→banco (§5B) — idempotencia del origen
--
-- Cuando el DOCENTE valida (aprueba) un caso de la bitácora del alumno, el dominio
-- (apps/api · ValidacionService) lo promueve al banco curado (`casos_biblioteca`,
-- "por curar") copiando la ficha + `contenido_estructurado` + el estudio anonimizado,
-- con `origen_caso_id` apuntando al caso de bitácora que lo originó (0024).
--
-- Este índice único PARCIAL garantiza que un caso de bitácora entre UNA sola vez al
-- banco: si el docente re-aprueba (o el flujo se reintenta), no se duplica la fila
-- curada. Solo aplica a las filas con origen (staff sube casos con origen null → no
-- restringido). Es también la traza de integridad del puente.
--
-- ADITIVO y SEED-SAFE: `create index if not exists`, sin datos. Las filas existentes
-- (staff, origen_caso_id null) no se ven afectadas. ⚠️ Solo esquema `lxp`; jamás el
-- `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

create unique index if not exists casos_biblioteca_origen_caso_unico
  on lxp.casos_biblioteca (origen_caso_id)
  where origen_caso_id is not null;
