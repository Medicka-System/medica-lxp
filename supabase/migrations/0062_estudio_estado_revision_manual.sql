-- ═══════════════════════════════════════════════════════════════════════════
-- 0062 · Pipeline DICOM — estado de CUARENTENA 'revision_manual' (§10 · fail-closed)
--
-- El redactor de PII quemada (services/redactor-dicom) es FAIL-CLOSED: si no puede
-- garantizar la redacción del nombre en los píxeles (formato no decodificable, nombre
-- dudoso o verificación post-redacción fallida) devuelve X-Revision-Manual=1. El worker
-- `procesar-dicom` entonces NO publica el estudio: lo deja en cuarentena para revisión
-- humana. Faltaba el valor de enum para ese estado (el enum solo tenía hasta 'error').
--
-- Un estudio en 'revision_manual' NO está 'anonimizado' → el visor no lo expone (el web
-- gatea en estudio_estado='anonimizado'); el caso muestra "en revisión, no se pudo
-- anonimizar". Solo esquema `lxp`; no toca CORA.
--
-- Nota PG: ALTER TYPE ... ADD VALUE se ejecuta en la transacción del migrador; el valor
-- nuevo NO se usa en esta misma migración (solo se declara), así que es seguro.
-- ═══════════════════════════════════════════════════════════════════════════

alter type lxp.estudio_dicom_estado add value if not exists 'revision_manual';
