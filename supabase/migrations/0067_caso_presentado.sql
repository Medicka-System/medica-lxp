-- ═══════════════════════════════════════════════════════════════════════════
-- 0067 · Ateneo — proyección del caso presentado (Ola B · B2 · cross-user por definer)
-- Campus Virtual LXP · Médica Capacitación
--
-- Sirve SOLO los campos PEDAGÓGICOS del caso de bitácora referenciado por un post del
-- Ateneo, gateado por la visibilidad del post (`puede_ver_post_ateneo` · 0066).
-- `bitacora_casos` permanece PRIVADA (owner/staff · bitacora_select intacta); esta es la
-- ÚNICA superficie cross-user, con whitelist SIN id_alumno/grupo_id/docente_id/
-- horas_estimadas/diagnostico ni enlace a reportes → cero PII (§10). Resuelve el bug
-- "el caso presentado llega vacío" a la audiencia del post (antes el join a bitácora
-- caía bajo RLS owner-only → aCasoVacio). Solo esquema `lxp`.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.caso_presentado(p_post uuid)
returns table (
  organo             text,
  dominio_iaim       text,
  vineta             text,
  hallazgos          text,
  estado_validacion  text,
  estudio_series     jsonb,
  created_at         timestamptz
)
language sql stable security definer set search_path = lxp, public as $$
  select c.organo, c.dominio_iaim::text, c.vineta, c.hallazgos,
         c.estado_validacion::text, c.estudio_series, c.created_at
  from lxp.posts_ateneo p
  join lxp.bitacora_casos c on c.id = p.caso_origen_id
  where p.id = p_post
    and lxp.puede_ver_post_ateneo(p_post);
$$;

revoke execute on function lxp.caso_presentado(uuid) from public;
grant execute on function lxp.caso_presentado(uuid) to authenticated, service_role;
