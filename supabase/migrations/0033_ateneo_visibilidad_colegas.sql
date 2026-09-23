-- ═══════════════════════════════════════════════════════════════════════════
-- 0033 · Ateneo — visibilidad por audiencia (Todo el Ateneo / Mis colegas)
--
-- El composer permite dirigir la publicación a toda la comunidad ('inscritos') o solo
-- a los colegas ('colegas'). El scoping NO es solo UI: la RLS de posts_ateneo esconde
-- los posts 'colegas' a quien no sea colega del autor (ni el autor ni staff).
--
-- comentarios_ateneo_select pasa a apoyarse en la visibilidad del post (subquery bajo
-- RLS): si no puedes ver el post, no ves sus comentarios. Solo esquema `lxp`.
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
        coalesce(visibilidad, 'inscritos') <> 'colegas'
        or exists (
          select 1 from lxp.conexiones_ateneo cx
          where cx.estado = 'colegas'
            and (
              (cx.solicitante_id = posts_ateneo.autor_id and cx.receptor_id = auth.uid())
              or (cx.receptor_id = posts_ateneo.autor_id and cx.solicitante_id = auth.uid())
            )
        )
      )
    )
  );

-- Comentarios visibles solo si el POST es visible (hereda el scoping de colegas).
drop policy if exists comentarios_ateneo_select on lxp.comentarios_ateneo;
create policy comentarios_ateneo_select on lxp.comentarios_ateneo
  for select to authenticated
  using (
    lxp.es_staff()
    or exists (select 1 from lxp.posts_ateneo p where p.id = post_id)
  );
