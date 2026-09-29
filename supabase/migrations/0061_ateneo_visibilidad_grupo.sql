-- ═══════════════════════════════════════════════════════════════════════════
-- 0061 · Ateneo — visibilidad por audiencia "Mi grupo" (alcance DERIVADO)
--
-- El composer suma una 3ª audiencia: "Mi grupo" → posts con visibilidad='grupo'. El scope
-- NO es solo UI: la RLS de posts_ateneo esconde un post 'grupo' a quien NO comparta grupo
-- CORA con el autor. "Compartir grupo" se resuelve con lxp.ateneo_mi_grupo_roster()
-- (SECURITY DEFINER · mig 0055): el conjunto de user_ids inscritos en los grupos donde YO
-- (auth.uid()) estoy inscrito. Un post 'grupo' es visible si autor_id ∈ ese roster.
--
-- OJO con la lógica previa (0033): el gate era `visibilidad <> 'colegas'`, que dejaba pasar
-- CUALQUIER valor nuevo (incl. 'grupo') a toda la comunidad. Aquí se reestructura para gatear
-- explícitamente 'colegas' Y 'grupo'; 'inscritos'/'publico' siguen abiertos a los inscritos.
--
-- El autor y el staff ven siempre (cláusula externa). comentarios_ateneo_select (0033) ya
-- hereda el scope: su subquery `exists (select 1 from posts_ateneo p where p.id = post_id)`
-- corre bajo esta misma RLS → si no ves el post, no ves sus comentarios. No se re-crea.
-- Solo esquema `lxp`; no toca CORA (`public`).
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists posts_ateneo_select on lxp.posts_ateneo;
create policy posts_ateneo_select on lxp.posts_ateneo
  for select to authenticated
  using (
    autor_id = auth.uid()
    or lxp.es_staff()
    or (
      estado = 'aprobado'
      and (
        -- Toda la comunidad inscrita (o público): sin restricción por relación.
        coalesce(visibilidad, 'inscritos') not in ('colegas', 'grupo')
        -- Solo mis colegas: existe conexión aceptada entre autor y lector.
        or (
          visibilidad = 'colegas'
          and exists (
            select 1 from lxp.conexiones_ateneo cx
            where cx.estado = 'colegas'
              and (
                (cx.solicitante_id = posts_ateneo.autor_id and cx.receptor_id = auth.uid())
                or (cx.receptor_id = posts_ateneo.autor_id and cx.solicitante_id = auth.uid())
              )
          )
        )
        -- Solo mi cohorte: el autor comparte grupo CORA con el lector (roster · mig 0055).
        or (
          visibilidad = 'grupo'
          and posts_ateneo.autor_id in (select lxp.ateneo_mi_grupo_roster())
        )
      )
    )
  );
