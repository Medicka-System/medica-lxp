-- ═══════════════════════════════════════════════════════════════════════════
-- 0032 · Ateneo — red social médica del alumno (§1 · mock alumno/ateneo)
--
-- El Ateneo YA existe (posts_ateneo/comentarios_ateneo/comentario_upvotes · 0005/0015).
-- Esta migración agrega lo que la red social necesita, SEED-SAFE + RLS:
--   1. Nuevos TIPOS de post: texto, pregunta, media (además de caso/encuesta/anuncio).
--   2. Columnas de post: temas (pregunta), media (imágenes/video), cierra_en (encuesta),
--      compartidos (contador).
--   3. parent_id en comentarios → hilos anidados de 2 niveles.
--   4. REACCIONES clínicas (6 tipos, una por usuario y post, cambiable).
--   5. ENCUESTAS: opciones + votos (uno por usuario, cambiable; el % se deriva).
--   6. COLEGAS: conexiones entre personas (pendiente/colegas).
--   7. Perfil: especialidad + sede (el "meta" de la tarjeta).
--
-- Solo esquema `lxp`; jamás `public` de CORA (§10). Grants explícitos (no retroactivos).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · nuevos tipos de post (add value no se USA en esta txn · lo usa el seed) ──
alter type lxp.post_ateneo_tipo add value if not exists 'texto';
alter type lxp.post_ateneo_tipo add value if not exists 'pregunta';
alter type lxp.post_ateneo_tipo add value if not exists 'media';

-- ── 2 · columnas de post ──
alter table lxp.posts_ateneo
  add column if not exists temas       jsonb not null default '[]'::jsonb,   -- pregunta
  add column if not exists media       jsonb not null default '[]'::jsonb,   -- [{tipo,url}]
  add column if not exists cierra_en   timestamptz,                          -- encuesta
  add column if not exists compartidos integer not null default 0;

-- ── 3 · hilos anidados en comentarios (2 niveles · se aplana al render) ──
alter table lxp.comentarios_ateneo
  add column if not exists parent_id uuid references lxp.comentarios_ateneo(id) on delete cascade;

-- ── 4 · REACCIONES (6 tipos clínicos; una por (post, usuario), cambiable) ──
do $$ begin
  create type lxp.reaccion_ateneo_tipo as enum ('util', 'ojo', 'aclara', 'bien', 'duda', 'gracias');
exception when duplicate_object then null; end $$;

create table if not exists lxp.reacciones_ateneo (
  post_id    uuid not null references lxp.posts_ateneo(id) on delete cascade,
  usuario_id uuid not null references lxp.perfiles(user_id) on delete cascade,
  tipo       lxp.reaccion_ateneo_tipo not null,
  created_at timestamptz not null default now(),
  primary key (post_id, usuario_id)
);
create index if not exists reacciones_ateneo_post_idx on lxp.reacciones_ateneo (post_id);

alter table lxp.reacciones_ateneo enable row level security;
drop policy if exists reacciones_ateneo_select on lxp.reacciones_ateneo;
create policy reacciones_ateneo_select on lxp.reacciones_ateneo
  for select to authenticated
  using (exists (select 1 from lxp.posts_ateneo p where p.id = post_id));
drop policy if exists reacciones_ateneo_ins on lxp.reacciones_ateneo;
create policy reacciones_ateneo_ins on lxp.reacciones_ateneo
  for insert to authenticated
  with check (usuario_id = auth.uid() and lxp.acceso_activo());
drop policy if exists reacciones_ateneo_upd on lxp.reacciones_ateneo;
create policy reacciones_ateneo_upd on lxp.reacciones_ateneo
  for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists reacciones_ateneo_del on lxp.reacciones_ateneo;
create policy reacciones_ateneo_del on lxp.reacciones_ateneo
  for delete to authenticated using (usuario_id = auth.uid());
grant select, insert, update, delete on lxp.reacciones_ateneo to authenticated;
grant all on lxp.reacciones_ateneo to service_role;

-- ── 5 · ENCUESTAS: opciones + votos ──
create table if not exists lxp.encuesta_opciones (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references lxp.posts_ateneo(id) on delete cascade,
  orden      integer not null default 0,
  texto      text not null
);
create index if not exists encuesta_opciones_post_idx on lxp.encuesta_opciones (post_id, orden);

create table if not exists lxp.encuesta_votos (
  post_id    uuid not null references lxp.posts_ateneo(id) on delete cascade,
  usuario_id uuid not null references lxp.perfiles(user_id) on delete cascade,
  opcion_id  uuid not null references lxp.encuesta_opciones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, usuario_id)  -- un voto por usuario, cambiable
);
create index if not exists encuesta_votos_opcion_idx on lxp.encuesta_votos (opcion_id);

alter table lxp.encuesta_opciones enable row level security;
alter table lxp.encuesta_votos enable row level security;

drop policy if exists encuesta_opciones_select on lxp.encuesta_opciones;
create policy encuesta_opciones_select on lxp.encuesta_opciones
  for select to authenticated
  using (exists (select 1 from lxp.posts_ateneo p where p.id = post_id));
drop policy if exists encuesta_opciones_ins on lxp.encuesta_opciones;
create policy encuesta_opciones_ins on lxp.encuesta_opciones
  for insert to authenticated
  with check (exists (
    select 1 from lxp.posts_ateneo p where p.id = post_id and p.autor_id = auth.uid()
  ) and lxp.acceso_activo());

drop policy if exists encuesta_votos_select on lxp.encuesta_votos;
create policy encuesta_votos_select on lxp.encuesta_votos
  for select to authenticated
  using (exists (select 1 from lxp.posts_ateneo p where p.id = post_id));
drop policy if exists encuesta_votos_ins on lxp.encuesta_votos;
create policy encuesta_votos_ins on lxp.encuesta_votos
  for insert to authenticated
  with check (usuario_id = auth.uid() and lxp.acceso_activo());
drop policy if exists encuesta_votos_upd on lxp.encuesta_votos;
create policy encuesta_votos_upd on lxp.encuesta_votos
  for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists encuesta_votos_del on lxp.encuesta_votos;
create policy encuesta_votos_del on lxp.encuesta_votos
  for delete to authenticated using (usuario_id = auth.uid());

grant select, insert, update, delete on lxp.encuesta_opciones to authenticated;
grant select, insert, update, delete on lxp.encuesta_votos to authenticated;
grant all on lxp.encuesta_opciones to service_role;
grant all on lxp.encuesta_votos to service_role;

-- ── 6 · COLEGAS (conexiones entre personas) ──
do $$ begin
  create type lxp.conexion_estado as enum ('pendiente', 'colegas');
exception when duplicate_object then null; end $$;

create table if not exists lxp.conexiones_ateneo (
  solicitante_id uuid not null references lxp.perfiles(user_id) on delete cascade,
  receptor_id    uuid not null references lxp.perfiles(user_id) on delete cascade,
  estado         lxp.conexion_estado not null default 'pendiente',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (solicitante_id, receptor_id),
  check (solicitante_id <> receptor_id)
);
create index if not exists conexiones_receptor_idx on lxp.conexiones_ateneo (receptor_id);

alter table lxp.conexiones_ateneo enable row level security;
-- Ver la conexión si me involucra (o staff).
drop policy if exists conexiones_select on lxp.conexiones_ateneo;
create policy conexiones_select on lxp.conexiones_ateneo
  for select to authenticated
  using (solicitante_id = auth.uid() or receptor_id = auth.uid() or lxp.es_staff());
-- Solicitar: yo soy el solicitante.
drop policy if exists conexiones_ins on lxp.conexiones_ateneo;
create policy conexiones_ins on lxp.conexiones_ateneo
  for insert to authenticated
  with check (solicitante_id = auth.uid() and lxp.acceso_activo());
-- Aceptar: el receptor pasa 'pendiente' → 'colegas'.
drop policy if exists conexiones_upd on lxp.conexiones_ateneo;
create policy conexiones_upd on lxp.conexiones_ateneo
  for update to authenticated
  using (receptor_id = auth.uid() or solicitante_id = auth.uid())
  with check (receptor_id = auth.uid() or solicitante_id = auth.uid());
-- Cancelar/eliminar: cualquiera de los dos.
drop policy if exists conexiones_del on lxp.conexiones_ateneo;
create policy conexiones_del on lxp.conexiones_ateneo
  for delete to authenticated
  using (solicitante_id = auth.uid() or receptor_id = auth.uid());

grant select, insert, update, delete on lxp.conexiones_ateneo to authenticated;
grant all on lxp.conexiones_ateneo to service_role;

drop trigger if exists conexiones_touch on lxp.conexiones_ateneo;
create trigger conexiones_touch before update on lxp.conexiones_ateneo
  for each row execute function lxp.touch_updated_at();

-- ── 7 · perfil: especialidad + sede (el "meta" de la tarjeta social) ──
alter table lxp.perfiles
  add column if not exists especialidad text,
  add column if not exists sede text;
