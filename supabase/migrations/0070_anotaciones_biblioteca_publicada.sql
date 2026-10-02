-- ═══════════════════════════════════════════════════════════════════════════
-- 0070 · Anotaciones DICOM — biblioteca solo si PUBLICADA (L-1 · auditoría RLS)
-- Campus Virtual LXP · Médica Capacitación
--
-- Antes: `anotaciones_dicom_select` dejaba ver SIN condición las anotaciones de
-- `tabla='casos_biblioteca'`, aun de casos de biblioteca NO publicados (mientras que
-- `casos_biblioteca_select` sí gatea por `publicado`). Ahora la rama de biblioteca exige
-- que el caso esté publicado (o staff). Las ramas autor / docente / bitácora-propia se
-- conservan idénticas. Solo esquema `lxp`; jamás public/auth (§10).
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists anotaciones_dicom_select on lxp.anotaciones_dicom;
create policy anotaciones_dicom_select on lxp.anotaciones_dicom for select to authenticated
  using (
    autor_id = auth.uid()
    or lxp.es_docente_o_mas()
    or (tabla = 'casos_biblioteca' and exists (
          select 1 from lxp.casos_biblioteca b
          where b.id = anotaciones_dicom.caso_id and (b.publicado or lxp.es_staff())))
    or (tabla = 'bitacora_casos' and exists (
          select 1 from lxp.bitacora_casos c
          where c.id = anotaciones_dicom.caso_id and c.id_alumno = auth.uid()))
  );
