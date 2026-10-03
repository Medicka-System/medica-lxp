-- ═══════════════════════════════════════════════════════════════════════════
-- 0073 · Canales Realtime: gate de suscripción + emisión por Broadcast · §7/§10
-- Campus Virtual LXP · Médica Capacitación
--
-- ⚠️ SOLO_SUPABASE: usa el esquema `realtime` (lo provee la plataforma Supabase; NO
--    existe en el Postgres local). El runner lo OMITE con MIGRATION_TARGET=local
--    (packages/db/src/migrate.ts · SOLO_SUPABASE).
-- ⚠️ NO se aplica a producción en este sprint (STOP del encargo: "NO habilites la
--    publicación Realtime en Supabase prod"). Queda LISTO para que el INTEGRADOR lo
--    habilite tras validar la versión del servicio `realtime` desplegado.
--
-- Mecanismo: Broadcast PRIVADO (no Postgres Changes). Ninguna tabla `lxp` entra a la
-- publicación `supabase_realtime` → C-1 intacto (nada de `lxp` se expone por WAL ni por
-- la Data API). El gate de SUSCRIPCIÓN es RLS sobre `realtime.messages`, que delega en
-- `lxp.rt_puede_escuchar(topic)` (mig 0072, probada en test:rls). La EMISIÓN la hacen
-- triggers que llaman `realtime.send(payload, event, topic, private)` con una SEÑAL
-- mínima (ids; nunca el cuerpo del mensaje ni PII).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Gate de SUSCRIPCIÓN (channel authorization) ──────────────────────────────
-- Un suscriptor `authenticated` solo RECIBE de un topic si `rt_puede_escuchar` lo
-- permite con su JWT. Para todo lo demás: default-deny (no hay policy permisiva).
drop policy if exists lxp_rt_recibir on realtime.messages;
create policy lxp_rt_recibir on realtime.messages
  for select
  to authenticated
  using ( lxp.rt_puede_escuchar( (select realtime.topic()) ) );

-- ── EMISIÓN · chat de consultas ──────────────────────────────────────────────
-- Mensaje nuevo → señal al topic de la consulta (el hilo) y al topic PERSONAL de la
-- OTRA parte (su badge de no-leídos). Payload: solo ids; nunca el cuerpo.
create or replace function lxp.rt_emit_consulta_mensaje()
returns trigger
language plpgsql
security definer
set search_path = lxp, public
as $$
declare
  v_alumno uuid; v_docente uuid; v_contacto uuid;
begin
  select id_alumno, id_docente, contacto_id
    into v_alumno, v_docente, v_contacto
    from lxp.consultas where id = NEW.consulta_id;

  perform realtime.send(
    jsonb_build_object('consulta_id', NEW.consulta_id),
    'mensaje', 'consulta:' || NEW.consulta_id::text, true);

  if v_alumno is not null and v_alumno <> NEW.autor_id then
    perform realtime.send(jsonb_build_object('fuente', 'consulta'),
      'badge', 'usuario:' || v_alumno::text, true);
  end if;
  if v_docente is not null and v_docente <> NEW.autor_id then
    perform realtime.send(jsonb_build_object('fuente', 'consulta'),
      'badge', 'usuario:' || v_docente::text, true);
  end if;
  if v_contacto is not null and v_contacto <> NEW.autor_id then
    perform realtime.send(jsonb_build_object('fuente', 'consulta'),
      'badge', 'usuario:' || v_contacto::text, true);
  end if;
  return NEW;
end;
$$;
drop trigger if exists rt_consulta_mensaje on lxp.consulta_mensajes;
create trigger rt_consulta_mensaje after insert on lxp.consulta_mensajes
  for each row execute function lxp.rt_emit_consulta_mensaje();

-- ── EMISIÓN · notificaciones (badges del sidebar: bitácora, validaciones, etc.) ──
create or replace function lxp.rt_emit_notificacion()
returns trigger
language plpgsql
security definer
set search_path = lxp, public
as $$
begin
  perform realtime.send(jsonb_build_object('fuente', 'notificacion'),
    'badge', 'usuario:' || NEW.id_usuario::text, true);
  return NEW;
end;
$$;
drop trigger if exists rt_notificacion on lxp.notificaciones;
create trigger rt_notificacion after insert on lxp.notificaciones
  for each row execute function lxp.rt_emit_notificacion();

-- ── EMISIÓN · feed del Ateneo (posts + comentarios) ──────────────────────────
-- Señal comunitaria "hay algo nuevo" al topic abierto `ateneo:feed`. Sin contenido:
-- la visibilidad real de cada post la vuelve a aplicar la RLS de `posts_ateneo` cuando
-- el cliente re-consulta el primer lote.
create or replace function lxp.rt_emit_ateneo()
returns trigger
language plpgsql
security definer
set search_path = lxp, public
as $$
begin
  perform realtime.send(jsonb_build_object('tabla', TG_TABLE_NAME),
    'feed', 'ateneo:feed', true);
  return NEW;
end;
$$;
drop trigger if exists rt_post_ateneo on lxp.posts_ateneo;
create trigger rt_post_ateneo after insert on lxp.posts_ateneo
  for each row execute function lxp.rt_emit_ateneo();
drop trigger if exists rt_comentario_ateneo on lxp.comentarios_ateneo;
create trigger rt_comentario_ateneo after insert on lxp.comentarios_ateneo
  for each row execute function lxp.rt_emit_ateneo();
