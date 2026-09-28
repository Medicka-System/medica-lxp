-- ═══════════════════════════════════════════════════════════════════════════
-- 0054 · El DOCENTE puede INICIAR una consulta (§5B) — amplía consultas_insert
--
-- Hasta hoy consultas_insert (0010) solo permitía al ALUMNO abrir la suya
-- (id_alumno = auth.uid() and acceso_activo). Ahora el docente también inicia el
-- canal 1:1 (reusa el modal). En el modelo, el docente es SIEMPRE la parte "contacto"
-- (contacto_id/id_docente) y la contraparte es id_alumno — así el otro lado lo ve por
-- id_alumno y el docente por contacto_id/id_docente (consistente con el seed staff→docente).
--
-- Se agrega la vía docente: es_docente_o_mas() y él es la parte contacto (id_docente o
-- contacto_id = auth.uid()). La vía alumno queda intacta. Solo esquema `lxp` (§10).
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists consultas_insert on lxp.consultas;
create policy consultas_insert on lxp.consultas
  for insert to authenticated
  with check (
    -- El alumno abre su propia consulta (sin cambios respecto a 0010).
    (id_alumno = auth.uid() and lxp.acceso_activo())
    -- El docente/staff inicia una consulta donde él es la parte contacto.
    or (lxp.es_docente_o_mas() and (id_docente = auth.uid() or contacto_id = auth.uid()))
  );
