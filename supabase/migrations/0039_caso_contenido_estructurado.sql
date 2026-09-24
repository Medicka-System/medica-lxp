-- ═══════════════════════════════════════════════════════════════════════════
-- 0039 · Contenido ESTRUCTURADO del caso (§6/§7A · "Opción B")
--
-- El caso educativo guardaba la verdad del estudio como texto aplanado (`hallazgos`),
-- lo que COLAPSA las tablas del reporte (biometría fetal DBP/CC/CA/LF, índices Doppler
-- PSV/EDV/IR por vaso): no se pueden reconstruir ni comparar celda-por-celda, y Eco no
-- puede evaluar contra rúbrica (§7A pedía "verdad estructurada, no texto libre").
--
-- Este cambio agrega `contenido_estructurado` (jsonb): un SNAPSHOT autocontenido de la
-- estructura del reporte (secciones/tablas/valores), la misma forma que
-- `reportes.contenido` + la `estructura` de la plantilla, copiada DENTRO del caso (no
-- referencia la plantilla — sobrevive a que ésta se edite o borre). El texto `hallazgos`
-- se conserva como índice DERIVADO (búsqueda / vistas simples / casos viejos).
--
-- Misma columna en `bitacora_casos` (caso del alumno / puente reporte→caso) y
-- `casos_biblioteca` (banco curado) para que el formato sea TRANSVERSAL y el puente
-- bitácora→banco copie la estructura verbatim, sin aplanar.
--
-- ADITIVO y SEED-SAFE: `add column if not exists`, nullable, sin default de datos. Las
-- filas viejas quedan con null → los consumidores caen al texto `hallazgos` (no se
-- rompen). El contrato de la forma vive en packages/shared (contenidoEstructuradoCaso).
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.bitacora_casos
  add column if not exists contenido_estructurado jsonb;

comment on column lxp.bitacora_casos.contenido_estructurado is
  'Snapshot estructurado del estudio (§6/§7A · Opción B): { secciones, valores, '
  'impresion, fuente } — misma forma que reportes.contenido + estructura de plantilla, '
  'autocontenido. Fuente de verdad; `hallazgos` (text) es el índice derivado. null = '
  'caso viejo/sin estructura → usar `hallazgos`.';

alter table lxp.casos_biblioteca
  add column if not exists contenido_estructurado jsonb;

comment on column lxp.casos_biblioteca.contenido_estructurado is
  'Snapshot estructurado del estudio curado (§6/§7A · Opción B): { secciones, valores, '
  'impresion, fuente }. El puente bitácora→banco lo copia verbatim (sin aplanar); la '
  'curaduría del docente lo edita. null = caso viejo → usar `hallazgos`/verdad curada.';
