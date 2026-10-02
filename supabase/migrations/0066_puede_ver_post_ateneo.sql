-- ═══════════════════════════════════════════════════════════════════════════
-- 0066 · Ateneo — helper único de visibilidad del post (Ola B · B2 · fuente única)
-- Campus Virtual LXP · Médica Capacitación
--
-- Extrae el predicado de `posts_ateneo_select` (0061) a una función SECURITY DEFINER:
-- (a) fuente única de la regla de visibilidad, y (b) reutilizable por `caso_presentado`
-- (0067) sin duplicar lógica. SECURITY DEFINER evita recursión de RLS (lee posts_ateneo
-- como owner); `auth.uid()` sigue siendo el del caller (los claims persisten en el GUC).
-- La policy pasa a llamar al helper → MISMO resultado que 0061. Solo esquema `lxp` (§10).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.puede_ver_post_ateneo(p_post uuid)
returns boolean language sql stable security definer set search_path = lxp, public as $$
  select exists (
    select 1 from lxp.posts_ateneo p
    where p.id = p_post
      and (
        p.autor_id = auth.uid()
        or lxp.es_staff()
        or (
          p.estado = 'aprobado'::lxp.estado_validacion
          and (
            coalesce(p.visibilidad, 'inscritos') not in ('colegas', 'grupo')
            or (p.visibilidad = 'colegas' and exists (
                  select 1 from lxp.conexiones_ateneo cx
                  where cx.estado = 'colegas'
                    and ((cx.solicitante_id = p.autor_id and cx.receptor_id = auth.uid())
                      or (cx.receptor_id = p.autor_id and cx.solicitante_id = auth.uid()))))
            or (p.visibilidad = 'grupo'
                and p.autor_id in (select lxp.ateneo_mi_grupo_roster()))
          )
        )
      )
  );
$$;

revoke execute on function lxp.puede_ver_post_ateneo(uuid) from public;
grant execute on function lxp.puede_ver_post_ateneo(uuid) to authenticated, service_role;

-- Fuente única: posts_ateneo_select delega en el helper (mismo resultado que 0061).
drop policy if exists posts_ateneo_select on lxp.posts_ateneo;
create policy posts_ateneo_select on lxp.posts_ateneo
  for select to authenticated
  using (lxp.puede_ver_post_ateneo(id));
