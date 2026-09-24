-- ═══════════════════════════════════════════════════════════════════════════
-- 0038 · Imagen de portada del grupo (§5A/§5B)
--
-- Un grupo puede tener su PROPIA imagen de portada (contenido educativo, no médica):
-- se ve en miniatura en el listado del Studio y en el card de "Mis cursos" del alumno,
-- por encima de la del programa. Es una referencia de object storage
-- (`media/imagenes/{id}.{ext}`) subida DIRECTO (sin Presidio · §10 solo aplica a paciente);
-- se lee con URL firmada de vida corta.
--
-- Solo esquema `lxp`. SEED-SAFE e idempotente: `add column if not exists`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.grupos add column if not exists imagen_portada text;

comment on column lxp.grupos.imagen_portada is
  'Ref de object storage (media/imagenes/{id}.{ext}) de la portada del grupo; null = hereda la del programa/placeholder. Contenido educativo, subida directa sin Presidio.';
