-- ═══════════════════════════════════════════════════════════════════════════
-- 0074 · Ateneo — posts_ateneo_select vuelve a PREDICADO INLINE (fix publicar)
-- Campus Virtual LXP · Médica Capacitación
--
-- BUG (regresión de 0066): 0066 dejó la policy SELECT de posts_ateneo como
--   using (lxp.puede_ver_post_ateneo(id))
-- un helper SECURITY DEFINER que hace un SELF-SELECT por id
-- (`select exists(select 1 from posts_ateneo where id = p_post ...)`).
-- Postgres aplica la policy SELECT (USING) a la fila RECIÉN insertada en
--   · INSERT … ON CONFLICT …  → la rama CASO (on conflict caso_origen_id)
--   · INSERT … RETURNING …    → la rama ENCUESTA (returning id)
-- La fila aún no es visible para el self-SELECT → el helper devuelve FALSE →
-- "new row violates row-level security policy for table posts_ateneo". El INSERT
-- plano (texto/imagen/gif/pregunta) solo evalúa WITH CHECK, por eso esos SÍ publican.
--
-- FIX: la policy vuelve a evaluar las COLUMNAS DE LA FILA (como en 0061) en vez de
-- re-consultar por id. La regla de visibilidad es IDÉNTICA (misma lógica que
-- puede_ver_post_ateneo, extraída byte a byte de 0061): autor / staff / aprobado +
-- (inscritos·público | colegas·conexión | grupo·roster). Para la fila nueva, el
-- autor cae en `autor_id = auth.uid()` → pasa; el feed de filas existentes evalúa igual.
--
-- Se CONSERVA la función lxp.puede_ver_post_ateneo(id): sus OTROS llamadores
-- (ensamblarPosts / caso_presentado · 0067) le pasan un id REAL existente y siguen
-- funcionando. Solo cambia la POLICY SELECT de posts_ateneo. No toca bitacora_casos,
-- ni ninguna policy de CORA (public). Solo esquema `lxp` (§10).
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
