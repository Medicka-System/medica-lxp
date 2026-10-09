-- ═══════════════════════════════════════════════════════════════════════════
-- 0078 · Thumbnail de caso/estudio server-side (§5A/§10) — ref estable familia B
-- Campus Virtual LXP · Médica Capacitación
--
-- El thumb de la card deja de rasterizarse en el cliente (frágil: estado efímero,
-- re-firma + re-decode por mount). Se genera UNA vez en el servidor AL ANONIMIZAR
-- (worker → redactor, desde el frame YA REDACTADO · §10) y se guarda como JPEG real
-- en object storage bajo `media/imagenes/casos/{casoId}/thumb.jpg` → lo sirve la
-- familia B estable (`media/imagenes/*`, URL firmada cacheable).
--
-- Esta migración es ADITIVA y SOLO toca el esquema `lxp`:
--   1) `estudio_thumb_ref text` (nullable) en `bitacora_casos` y `casos_biblioteca`
--      — la ref del JPEG; `null` = sin thumb (casos viejos / cuarentena / sin estudio)
--      → el front cae al raster-cliente (fallback de transición, fase 1).
--   2) `lxp.caso_presentado` (0067) gana la columna `estudio_thumb_ref` para que la
--      AUDIENCIA del Ateneo reciba la ref (server-side; el id de bitácora sigue sin
--      exponerse · §10). Cambia el tipo de retorno → hay que DROP + CREATE.
--
-- Sin backfill aquí (el backfill de casos ya anonimizados es un job one-time aparte).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Columna de la ref del thumb (nullable, idempotente). Solo esquema lxp.
alter table lxp.bitacora_casos
  add column if not exists estudio_thumb_ref text;
comment on column lxp.bitacora_casos.estudio_thumb_ref is
  'Ref del JPEG del thumb (media/imagenes/casos/{id}/thumb.jpg), generado server-side '
  'del frame YA REDACTADO al anonimizar (§10). null = sin thumb → fallback raster-cliente.';

alter table lxp.casos_biblioteca
  add column if not exists estudio_thumb_ref text;
comment on column lxp.casos_biblioteca.estudio_thumb_ref is
  'Ref del JPEG del thumb (media/imagenes/casos/{id}/thumb.jpg), generado server-side '
  'del frame YA REDACTADO al anonimizar (§10). null = sin thumb → fallback raster-cliente.';

-- 2) Redefinir `caso_presentado` para devolver también la ref del thumb. El tipo de
--    retorno (RETURNS TABLE) cambia → `create or replace` no basta: DROP + CREATE.
--    Idéntico a 0067 salvo la columna nueva `estudio_thumb_ref` al final (whitelist
--    sin PII intacta · §10).
drop function if exists lxp.caso_presentado(uuid);

create function lxp.caso_presentado(p_post uuid)
returns table (
  organo             text,
  dominio_iaim       text,
  vineta             text,
  hallazgos          text,
  estado_validacion  text,
  estudio_series     jsonb,
  estudio_thumb_ref  text,
  created_at         timestamptz
)
language sql stable security definer set search_path = lxp, public as $$
  select c.organo, c.dominio_iaim::text, c.vineta, c.hallazgos,
         c.estado_validacion::text, c.estudio_series, c.estudio_thumb_ref, c.created_at
  from lxp.posts_ateneo p
  join lxp.bitacora_casos c on c.id = p.caso_origen_id
  where p.id = p_post
    and lxp.puede_ver_post_ateneo(p_post);
$$;

revoke execute on function lxp.caso_presentado(uuid) from public;
grant execute on function lxp.caso_presentado(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- ROLLBACK (manual):
--   drop function if exists lxp.caso_presentado(uuid);
--   create function lxp.caso_presentado(p_post uuid)
--   returns table (organo text, dominio_iaim text, vineta text, hallazgos text,
--                  estado_validacion text, estudio_series jsonb, created_at timestamptz)
--   language sql stable security definer set search_path = lxp, public as $$
--     select c.organo, c.dominio_iaim::text, c.vineta, c.hallazgos,
--            c.estado_validacion::text, c.estudio_series, c.created_at
--     from lxp.posts_ateneo p
--     join lxp.bitacora_casos c on c.id = p.caso_origen_id
--     where p.id = p_post and lxp.puede_ver_post_ateneo(p_post);
--   $$;
--   revoke execute on function lxp.caso_presentado(uuid) from public;
--   grant execute on function lxp.caso_presentado(uuid) to authenticated, service_role;
--   alter table lxp.bitacora_casos  drop column if exists estudio_thumb_ref;
--   alter table lxp.casos_biblioteca drop column if exists estudio_thumb_ref;
-- ───────────────────────────────────────────────────────────────────────────
