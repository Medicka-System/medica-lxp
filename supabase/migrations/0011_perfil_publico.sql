-- ═══════════════════════════════════════════════════════════════════════════
-- 0011 · Nombre público de perfil (comunidad · §6)
--
-- La RLS de `lxp.perfiles` restringe SELECT a "el propio + staff" (§6). Pero el
-- Ateneo, los foros y los comentarios necesitan mostrar el NOMBRE del autor de
-- otros. En vez de abrir toda la fila, exponemos SOLO el nombre por una función
-- SECURITY DEFINER de solo-lectura. Nada sensible se filtra.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function lxp.nombre_de(p_user_id uuid)
returns text
language sql stable security definer set search_path = lxp, public as $$
  select nombre from lxp.perfiles where user_id = p_user_id;
$$;

grant execute on function lxp.nombre_de(uuid) to anon, authenticated, service_role;
