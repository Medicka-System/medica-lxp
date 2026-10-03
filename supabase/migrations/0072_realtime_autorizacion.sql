-- ═══════════════════════════════════════════════════════════════════════════
-- 0072 · Autorización de canales Realtime (Broadcast privado) · §7/§10
-- Campus Virtual LXP · Médica Capacitación
--
-- Decide, por el JWT del SUSCRIPTOR, si puede ESCUCHAR un `topic`. Es la pieza de
-- seguridad que el gate de canal (RLS sobre `realtime.messages`, mig 0073 SOLO_SUPABASE)
-- invoca con `realtime.topic()`. Vive en el esquema `lxp` y corre en AMBOS destinos
-- (local + Supabase) a propósito: así se PRUEBA en `test:rls` sin el servidor Realtime
-- (que no existe en el Postgres local). DEFAULT-DENY: topic desconocido o sin sesión → false.
--
-- Elegimos Broadcast (no Postgres Changes) para NO meter ninguna tabla `lxp` en la
-- publicación `supabase_realtime` (C-1 intacto: nada de `lxp` se expone por WAL). El
-- payload Realtime es una SEÑAL mínima; el dato real SIEMPRE se re-consulta bajo RLS.
--
-- Topics del proyecto:
--   usuario:<uid>   → notificaciones y badges personales (solo el dueño del uid)
--   consulta:<id>   → chat 1:1 (solo las partes de la consulta, o staff docente+)
--   ateneo:feed     → comunidad (cualquier inscrito con acceso activo, o staff)
--
-- Reglas de SPLIT: corre en AMBOS destinos (solo usa objetos `lxp`/`auth.uid()`).
-- Solo esquema `lxp`; jamás `public` de CORA (§10).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.rt_puede_escuchar(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = lxp, public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  -- anon / sin sesión: nunca en un canal privado.
  if v_uid is null or p_topic is null then
    return false;
  end if;

  -- Personal (notificaciones + badges del sidebar): solo el propio usuario.
  -- 'usuario:' = 8 chars → el uid empieza en la posición 9.
  if p_topic like 'usuario:%' then
    return substring(p_topic from 9) = v_uid::text;
  end if;

  -- Chat 1:1: parte de la consulta (alumno/docente/contacto) o staff docente+.
  -- Espeja EXACTAMENTE la policy `consulta_mensajes_select` (mismo alcance que el dato).
  -- 'consulta:' = 9 chars → el id empieza en la posición 10.
  if p_topic like 'consulta:%' then
    begin
      v_id := substring(p_topic from 10)::uuid;
    exception when others then
      return false;                      -- id mal formado → deny
    end;
    if lxp.es_docente_o_mas() then
      return true;
    end if;
    return exists (
      select 1 from lxp.consultas q
      where q.id = v_id
        and (q.id_alumno = v_uid or q.id_docente = v_uid or q.contacto_id = v_uid)
    );
  end if;

  -- Comunidad (feed del Ateneo + badge de no-leídos): inscrito con acceso activo o staff.
  -- El contenido de cada post lo filtra de nuevo la RLS de `posts_ateneo` al re-consultar;
  -- aquí solo se autoriza RECIBIR la señal "hay algo nuevo".
  if p_topic = 'ateneo:feed' then
    return coalesce(
      (select acceso_activo from lxp.perfiles where user_id = v_uid),
      false
    ) or lxp.es_staff();
  end if;

  return false;                          -- topic desconocido → deny
end;
$$;

-- Mínimo privilegio (coherente con mig 0065 · L-2): NO se otorga a `anon` — un canal
-- Realtime privado solo lo usa el rol `authenticated`; anon ni siquiera puede ejecutarla.
revoke all on function lxp.rt_puede_escuchar(text) from public;
grant execute on function lxp.rt_puede_escuchar(text) to authenticated, service_role;

comment on function lxp.rt_puede_escuchar(text) is
  'Gate de autorización de canal Realtime (Broadcast privado). Default-deny · §7/§10.';
