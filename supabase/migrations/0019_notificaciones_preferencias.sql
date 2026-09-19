-- ═══════════════════════════════════════════════════════════════════════════
-- 0019 · Motor de notificaciones (§8 job #12 · Sprint 8.5) — SOLO esquema `lxp`
--
-- Un evento "para este usuario, de este tipo" se persiste como notificación in-app
-- (la campana) y se despacha por los canales opt-in (correo/WhatsApp) según la
-- PREFERENCIA del usuario. El worker escribe con service_role (omite RLS); el usuario
-- lee/marca las suyas. Este archivo NO toca `public` (CORA) — regla 3 (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums (deben coincidir con TipoNotificacion/CanalNotificacion en @campus/shared) ──
create type lxp.notificacion_tipo as enum (
  'caso_validado',
  'caso_rechazado',
  'hito_alcanzado',
  'certificado_emitido',
  'badge_otorgado',
  'repaso_sugerido',
  'nueva_consulta',
  'respuesta_consulta',
  'entrega_calificada',
  'anuncio'
);

create type lxp.canal_notificacion as enum ('in_app', 'correo', 'whatsapp');

-- ── notificaciones: feed in-app + registro de canales por los que se envió ──
create table lxp.notificaciones (
  id               uuid primary key default gen_random_uuid(),
  id_usuario       uuid not null references lxp.perfiles(user_id) on delete cascade,
  tipo             lxp.notificacion_tipo not null,
  titulo           text not null,
  cuerpo           text not null,
  -- Entidad que originó el evento, para el deep-link ('caso'/'certificado'/'consulta'…).
  entidad_tipo     text,
  entidad_id       uuid,
  -- Canales por los que EFECTIVAMENTE se despachó (in_app siempre; correo/whatsapp opt-in).
  canales_enviados lxp.canal_notificacion[] not null default array['in_app']::lxp.canal_notificacion[],
  leida            boolean not null default false,
  leida_en         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index notificaciones_usuario_no_leida_idx
  on lxp.notificaciones (id_usuario, leida);
create index notificaciones_usuario_creada_idx
  on lxp.notificaciones (id_usuario, created_at desc);

create trigger notificaciones_touch
  before update on lxp.notificaciones
  for each row execute function lxp.touch_updated_at();

-- ── preferencias_notificaciones: 1 fila por usuario; overrides por tipo/canal ──
-- `preferencias` jsonb: { "<tipo>": { "correo": false, "whatsapp": true }, ... }.
-- Lo ausente cae en la matriz DEFECTOS_NOTIFICACION del contrato compartido.
create table lxp.preferencias_notificaciones (
  id_usuario     uuid primary key references lxp.perfiles(user_id) on delete cascade,
  preferencias   jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger preferencias_notificaciones_touch
  before update on lxp.preferencias_notificaciones
  for each row execute function lxp.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS + grants (patrón §6/§10 · igual que 0010)
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.notificaciones             enable row level security;
alter table lxp.preferencias_notificaciones enable row level security;

-- notificaciones: las ESCRIBE el motor (service_role). authenticated solo lee y marca
-- leída lo suyo (no inserta ni borra · igual que las proyecciones en 0010).
revoke insert, delete on lxp.notificaciones from authenticated;

create policy notificaciones_select on lxp.notificaciones
  for select to authenticated
  using (id_usuario = auth.uid() or lxp.es_staff());

create policy notificaciones_update on lxp.notificaciones
  for update to authenticated
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());

-- preferencias: cada quien ve/crea/edita SOLO las suyas (upsert al primer guardado).
create policy preferencias_notif_select on lxp.preferencias_notificaciones
  for select to authenticated
  using (id_usuario = auth.uid() or lxp.es_staff());

create policy preferencias_notif_insert on lxp.preferencias_notificaciones
  for insert to authenticated
  with check (id_usuario = auth.uid());

create policy preferencias_notif_update on lxp.preferencias_notificaciones
  for update to authenticated
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());
