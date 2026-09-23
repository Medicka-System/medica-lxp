-- ═══════════════════════════════════════════════════════════════════════════
-- 0034 · Consultas — chat 1:1 del alumno (§ Sprint 5.5 · mock alumno/consultas)
--
-- El motor YA existe (consultas/consulta_mensajes · 0007) alumno↔docente. Esta
-- migración lo generaliza a chat 1:1 con DOCENTE, STAFF o COLEGA, seed-safe + RLS:
--   · contacto_id  → la OTRA parte (docente/staff/colega), además de id_docente.
--   · tipo_contacto → forma del contacto (docente/staff/colega · el chip).
--   · origen_leccion_id → la lección de la que nace la consulta (franja de origen).
--   · alumno_leido_en / contacto_leido_en → marca de lectura (deriva "no leídos").
--   · cerrada_el → cuándo se cerró.
--   · consulta_mensajes.adjuntos → adjuntos del mensaje (subida real · PENDIENTE).
--
-- El ESTADO (abierta/respondida/cerrada/null) NO se almacena entero: se guarda
-- 'abierta'|'cerrada' (compat con la consola del docente) y "respondida" se DERIVA
-- (último mensaje del contacto); "null" es para colegas (entre pares nadie atiende).
--
-- Solo esquema `lxp`; jamás `public` de CORA. Grants ya cubiertos por 0010 (mismas
-- tablas); las policies se reescriben para incluir a `contacto_id`.
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type lxp.consulta_tipo_contacto as enum ('docente', 'staff', 'colega');
exception when duplicate_object then null; end $$;

alter table lxp.consultas
  add column if not exists contacto_id       uuid references lxp.perfiles(user_id) on delete set null,
  add column if not exists tipo_contacto     lxp.consulta_tipo_contacto not null default 'docente',
  add column if not exists origen_leccion_id uuid references lxp.lecciones(id) on delete set null,
  add column if not exists cerrada_el         timestamptz,
  add column if not exists alumno_leido_en    timestamptz,
  add column if not exists contacto_leido_en  timestamptz;

create index if not exists consultas_contacto_idx on lxp.consultas (contacto_id);

alter table lxp.consulta_mensajes
  add column if not exists adjuntos jsonb not null default '[]'::jsonb;

-- ── RLS: ambas partes (alumno + contacto) ven la consulta; staff todo ──
drop policy if exists consultas_select on lxp.consultas;
create policy consultas_select on lxp.consultas
  for select to authenticated
  using (
    id_alumno = auth.uid()
    or id_docente = auth.uid()
    or contacto_id = auth.uid()
    or lxp.es_docente_o_mas()
  );

drop policy if exists consultas_update on lxp.consultas;
create policy consultas_update on lxp.consultas
  for update to authenticated
  using (id_alumno = auth.uid() or id_docente = auth.uid() or contacto_id = auth.uid() or lxp.es_docente_o_mas())
  with check (id_alumno = auth.uid() or id_docente = auth.uid() or contacto_id = auth.uid() or lxp.es_docente_o_mas());

-- INSERT sin cambios (0010): id_alumno = auth.uid() and acceso_activo.

drop policy if exists consulta_mensajes_select on lxp.consulta_mensajes;
create policy consulta_mensajes_select on lxp.consulta_mensajes
  for select to authenticated
  using (
    lxp.es_docente_o_mas()
    or exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid() or q.contacto_id = auth.uid())
    )
  );

drop policy if exists consulta_mensajes_insert on lxp.consulta_mensajes;
create policy consulta_mensajes_insert on lxp.consulta_mensajes
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid() or q.contacto_id = auth.uid() or lxp.es_docente_o_mas())
    )
  );
