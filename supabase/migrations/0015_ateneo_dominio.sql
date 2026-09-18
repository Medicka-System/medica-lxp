-- ═══════════════════════════════════════════════════════════════════════════
-- 0015 · Dominio del Ateneo (§6/§5B · Sprint 5)
--   (1) Enlace caso→post: publicar un caso VALIDADO al feed de la comunidad,
--       de forma idempotente (un caso genera a lo sumo un post).
--   (2) Upvotes con REGLAS: tabla de votos (evita doble voto por PK), contador
--       derivado mantenido por trigger, y RLS (no votar el propio comentario,
--       solo sobre posts visibles). El toggle del voto es CRUD del web bajo RLS
--       (Regla de Oro §2); aquí vive la INTEGRIDAD, no un proxy.
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── (1) posts_ateneo: origen del caso publicado (idempotencia + trazabilidad) ──
alter table lxp.posts_ateneo
  add column if not exists caso_origen_id uuid
    references lxp.bitacora_casos(id) on delete set null;

-- Un caso de bitácora genera A LO SUMO un post en el Ateneo. El índice parcial
-- único es lo que hace idempotente al `publicarCaso` del dominio (ON CONFLICT).
create unique index if not exists posts_ateneo_caso_origen_uidx
  on lxp.posts_ateneo (caso_origen_id)
  where caso_origen_id is not null;

comment on column lxp.posts_ateneo.caso_origen_id is
  'Caso de bitácora (aprobado y anonimizado) del que se publicó este post. Único: '
  'un caso genera a lo sumo un post — idempotencia del publish (§5B · Sprint 5).';

-- ── (2) comentario_upvotes: un voto por (comentario, usuario) ──
create table if not exists lxp.comentario_upvotes (
  comentario_id uuid not null references lxp.comentarios_ateneo(id) on delete cascade,
  usuario_id    uuid not null references lxp.perfiles(user_id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- La PK ES la regla anti doble-voto: un usuario no puede votar dos veces.
  primary key (comentario_id, usuario_id)
);

create index if not exists comentario_upvotes_usuario_idx
  on lxp.comentario_upvotes (usuario_id);

-- Grants de la tabla nueva (0010 solo cubrió las de entonces). El web vota directo
-- bajo RLS (insert/delete/select); no hay UPDATE (un voto no se edita, se togglea).
grant select, insert, delete on lxp.comentario_upvotes to authenticated;
grant all on lxp.comentario_upvotes to service_role;

-- Contador denormalizado `comentarios_ateneo.upvotes` = COUNT de votos, mantenido
-- por trigger. Fuente de verdad = filas de comentario_upvotes; el conteo nunca se
-- toca a mano. SECURITY DEFINER: corre como owner para actualizar el comentario
-- (aunque el votante no sea su autor) sin abrir la policy de UPDATE a cualquiera.
create or replace function lxp.recalcular_upvotes() returns trigger
language plpgsql security definer set search_path = lxp, public as $$
declare
  objetivo uuid := coalesce(new.comentario_id, old.comentario_id);
begin
  update lxp.comentarios_ateneo c
    set upvotes = (
      select count(*)::int
      from lxp.comentario_upvotes v
      where v.comentario_id = objetivo
    )
    where c.id = objetivo;
  return null;
end;
$$;

drop trigger if exists comentario_upvotes_contar on lxp.comentario_upvotes;
create trigger comentario_upvotes_contar
  after insert or delete on lxp.comentario_upvotes
  for each row execute function lxp.recalcular_upvotes();

-- ── RLS del voto ──
alter table lxp.comentario_upvotes enable row level security;

-- Ve sus propios votos (para pintar el estado "ya voté") y el staff todo.
create policy comentario_upvotes_select on lxp.comentario_upvotes
  for select to authenticated
  using (usuario_id = auth.uid() or lxp.es_staff());

-- Vota como sí mismo, con acceso activo, sobre un comentario de un post visible,
-- y NUNCA su propio comentario. La unicidad (PK) cierra el doble voto.
create policy comentario_upvotes_insert on lxp.comentario_upvotes
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and lxp.acceso_activo()
    and exists (
      select 1
      from lxp.comentarios_ateneo c
      join lxp.posts_ateneo p on p.id = c.post_id
      where c.id = comentario_id
        and c.autor_id <> auth.uid()                       -- no votar lo propio
        and (p.estado = 'aprobado' or p.autor_id = auth.uid())
    )
  );

-- Puede retirar su propio voto (toggle).
create policy comentario_upvotes_delete on lxp.comentario_upvotes
  for delete to authenticated
  using (usuario_id = auth.uid());
