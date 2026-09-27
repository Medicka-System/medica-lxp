-- 0049 · Congelar la estructura de la plantilla dentro del reporte (SNAPSHOT embebido · §6.5)
--
-- PROBLEMA: si el médico edita una plantilla en producción (agrega/quita/renombra campos), los
-- reportes ya hechos con la versión anterior se corrompían al renderizar (leían la estructura VIVA).
--
-- DECISIÓN (tomada): snapshot embebido, reporte autocontenido, SIN tabla de versiones.
--
-- Dónde vive el snapshot: DENTRO de `reportes.contenido` (jsonb), junto al resto del estado-instancia
-- del reporte (valores/folio/impresion/plantillaId) — así NO hay DDL sobre lxp.reportes y el render,
-- que ya parsea `contenido`, solo lee una llave más. Claves en camelCase para ser consistentes con
-- las existentes de `contenido` (`plantillaId`, `valores`, `impresion`): `estructuraSnapshot`,
-- `plantillaVersion`.
--
-- `plantillas_reporte` sí gana una columna `version` (lxp, permitido). `updated_at` YA existe (0004/0007)
-- con trigger `touch`, así que el bump de versión también refresca updated_at automáticamente.

alter table lxp.plantillas_reporte add column if not exists version int not null default 1;

-- BACKFILL: cada reporte existente congela la estructura ACTUAL de su plantilla como v1 (legacy).
-- Solo los que aún no tienen snapshot y cuyo `contenido` es un objeto jsonb (evita filas antiguas
-- doble-codificadas como texto; esas caen al fallback de la plantilla viva al renderizar).
update lxp.reportes r
set contenido = r.contenido || jsonb_build_object('estructuraSnapshot', p.estructura, 'plantillaVersion', 1)
from lxp.plantillas_reporte p
where p.id = r.plantilla_id
  and jsonb_typeof(r.contenido) = 'object'
  and (r.contenido -> 'estructuraSnapshot') is null;
