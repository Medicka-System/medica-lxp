-- ═══════════════════════════════════════════════════════════════════════════
-- 0076 · Ateneo — MENCIONES @ en comentarios (estructurado + scope + notificación)
-- Campus Virtual LXP · Médica Capacitación
--
-- Una mención es ESTRUCTURADA (tabla, no se parsea @ del texto en cada render): el
-- cuerpo guarda un token `@[nombre](uuid)` para el render; la tabla es la verdad de
-- QUIÉN fue mencionado (scope, notificación, consultas). Contenido:
--   1. `comentario_menciones` (comentario_id, usuario_mencionado_id) + RLS + grants.
--   2. `ateneo_roster_de(uuid)`: roster de grupo de un usuario (para el scope de las
--      menciones en posts de visibilidad 'grupo'), con GATE de que el caller comparta
--      grupo (no expone rosters de cohortes ajenas).
--   3. Notificación in-app "te mencionaron": nuevo valor de enum `mencion_comentario`
--      + trigger SECURITY DEFINER que inserta en `lxp.notificaciones` (reusa la campana).
--
-- Privacidad / scope (§10): la mención es VISIBLE bajo el MISMO scope que el comentario
-- (que hereda la visibilidad del post). El WEB valida además que el mencionado pertenezca
-- a la audiencia del post antes de insertar (autocomplete acotado + validación al persistir);
-- la RLS de aquí es el segundo candado. NO toca `public` (CORA) salvo LECTURA en funciones
-- SECURITY DEFINER (igual que 0055). Solo esquema `lxp`.
--
-- ⚠️ Lección 0074 (no repetir la trampa): la policy SELECT de `comentario_menciones` NO
-- hace self-SELECT sobre su propia tabla; consulta `comentarios_ateneo` (otra tabla, que
-- ya hereda el scope del post). Los INSERT no usan RETURNING.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · tabla de menciones ──
create table if not exists lxp.comentario_menciones (
  comentario_id         uuid not null references lxp.comentarios_ateneo(id) on delete cascade,
  usuario_mencionado_id uuid not null references lxp.perfiles(user_id) on delete cascade,
  created_at            timestamptz not null default now(),
  primary key (comentario_id, usuario_mencionado_id)
);
create index if not exists comentario_menciones_comentario_idx on lxp.comentario_menciones (comentario_id);
create index if not exists comentario_menciones_usuario_idx on lxp.comentario_menciones (usuario_mencionado_id);

alter table lxp.comentario_menciones enable row level security;

-- SELECT: visible si el COMENTARIO es visible (hereda el scope del post vía la RLS de
-- comentarios_ateneo). INLINE sobre OTRA tabla, sin self-SELECT (lección 0074).
drop policy if exists comentario_menciones_select on lxp.comentario_menciones;
create policy comentario_menciones_select on lxp.comentario_menciones
  for select to authenticated
  using (exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id));

-- INSERT: SOLO el autor del comentario agrega menciones a SU comentario (con acceso activo).
-- Que el mencionado esté en la audiencia del post se valida en el web (y es, además, lo que
-- hace la mención "legible" — si no ve el post, no verá el comentario ni la mención).
drop policy if exists comentario_menciones_ins on lxp.comentario_menciones;
create policy comentario_menciones_ins on lxp.comentario_menciones
  for insert to authenticated
  with check (
    lxp.acceso_activo()
    and exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id and c.autor_id = auth.uid())
  );

-- DELETE: el autor del comentario (o staff) puede retirar menciones de su comentario.
drop policy if exists comentario_menciones_del on lxp.comentario_menciones;
create policy comentario_menciones_del on lxp.comentario_menciones
  for delete to authenticated
  using (
    lxp.es_staff()
    or exists (select 1 from lxp.comentarios_ateneo c where c.id = comentario_id and c.autor_id = auth.uid())
  );

grant select, insert, delete on lxp.comentario_menciones to authenticated;
grant all on lxp.comentario_menciones to service_role;

-- ── 2 · roster de grupo de un usuario (para el scope 'grupo' de las menciones) ──
-- Compañeros de grupo CORA de p_user. GATE: solo devuelve filas si el CALLER (auth.uid())
-- comparte algún grupo con p_user → no expone rosters de cohortes ajenas (§10). Simétrico a
-- ateneo_mi_grupo_roster (0055): "comparten grupo" es simétrico, así que esto = la audiencia
-- de un post 'grupo' cuyo autor es p_user.
create or replace function lxp.ateneo_roster_de(p_user uuid)
returns setof uuid
language sql stable security definer set search_path = lxp, public as $$
  select distinct e2.supabase_auth_id
  from public.estudiantes e1
  join public.grupo_alumnos ga1 on ga1.estudiante_id = e1.id
  join public.grupo_alumnos ga2 on ga2.grupo_id = ga1.grupo_id
  join public.estudiantes e2 on e2.id = ga2.estudiante_id
  where e1.supabase_auth_id = p_user
    and e2.supabase_auth_id is not null
    and exists (
      select 1
      from public.estudiantes ec
      join public.grupo_alumnos gac on gac.estudiante_id = ec.id
      join public.grupo_alumnos gap on gap.grupo_id = gac.grupo_id
      join public.estudiantes ep on ep.id = gap.estudiante_id
      where ec.supabase_auth_id = auth.uid() and ep.supabase_auth_id = p_user
    );
$$;
revoke execute on function lxp.ateneo_roster_de(uuid) from public;
grant execute on function lxp.ateneo_roster_de(uuid) to authenticated, service_role;

-- ── 3 · notificación in-app "te mencionaron" ──
-- Nuevo tipo. (ADD VALUE if not exists no se USA en esta txn; el trigger lo usa en runtime.)
alter type lxp.notificacion_tipo add value if not exists 'mencion_comentario';

-- El cuerpo del trigger referencia el valor de enum recién agregado. No se puede VALIDAR en
-- la misma txn del ADD VALUE; se desactiva la validación de cuerpos (el literal se resuelve en
-- runtime, en la txn posterior del INSERT de la mención, cuando el valor ya está commiteado).
set local check_function_bodies = off;

create or replace function lxp.notificar_mencion_comentario()
returns trigger
language plpgsql security definer set search_path = lxp, public as $$
declare
  v_autor uuid;
  v_post  uuid;
  v_nombre text;
begin
  select c.autor_id, c.post_id into v_autor, v_post
  from lxp.comentarios_ateneo c where c.id = new.comentario_id;
  -- Sin auto-notificación (mencionarte a ti mismo no avisa).
  if v_autor is null or v_autor = new.usuario_mencionado_id then
    return new;
  end if;
  v_nombre := coalesce(lxp.nombre_de(v_autor), 'Un colega');
  -- Escribe como OWNER (SECURITY DEFINER): notificaciones tiene INSERT revocado a authenticated.
  -- Solo in-app (entidad 'post' → deep-link al Ateneo). El despacho correo/WhatsApp del motor
  -- NO cubre menciones todavía (fase 2); por eso 'mencion_comentario' no se expone en toggles.
  insert into lxp.notificaciones (id_usuario, tipo, titulo, cuerpo, entidad_tipo, entidad_id)
  values (new.usuario_mencionado_id, 'mencion_comentario', 'Te mencionaron en el Ateneo',
          v_nombre || ' te mencionó en un comentario.', 'post', v_post);
  return new;
end;
$$;

drop trigger if exists comentario_menciones_notificar on lxp.comentario_menciones;
create trigger comentario_menciones_notificar
  after insert on lxp.comentario_menciones
  for each row execute function lxp.notificar_mencion_comentario();
