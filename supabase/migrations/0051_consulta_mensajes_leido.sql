-- ═══════════════════════════════════════════════════════════════════════════
-- 0051 · Consultas — read-receipts PER-MENSAJE (enviado/leído · bidireccional)
--
-- Hasta hoy el "leído" se derivaba del timestamp de hilo `alumno_leido_en` (0034),
-- que solo cubre un lado y no distingue mensaje por mensaje. Se agrega `leido_en`
-- a cada mensaje: null = no leído; fecha = leído por la contraparte.
--
--   · Backfill: los mensajes existentes → leido_en = created_at (asumir leídos,
--     para no mostrar todo el historial como "no leído" de golpe).
--   · RLS: se agrega policy de UPDATE en consulta_mensajes — SOLO para marcar
--     leído mensajes RECIBIDOS (autor <> uid) de consultas en las que uno participa.
--     Nadie puede editar sus PROPIOS mensajes por esta vía (autor_id <> auth.uid()).
--
-- Grants: el UPDATE a `authenticated` ya está en 0010 (grant a todas las tablas lxp);
-- aquí solo falta la POLICY (consulta_mensajes tenía select+insert, no update).
-- Solo esquema `lxp`; jamás `public` de CORA (§10). Seed-safe / idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp.consulta_mensajes
  add column if not exists leido_en timestamptz;

-- Backfill: historial existente se asume leído (evita un salto masivo de "no leídos").
update lxp.consulta_mensajes set leido_en = created_at where leido_en is null;

-- Índice para el conteo de no-leídos por consulta (autor <> viewer and leido_en is null).
create index if not exists consulta_mensajes_no_leidos_idx
  on lxp.consulta_mensajes (consulta_id, leido_en);

-- RLS: marcar leído los mensajes RECIBIDOS de una consulta en la que uno participa.
drop policy if exists consulta_mensajes_update on lxp.consulta_mensajes;
create policy consulta_mensajes_update on lxp.consulta_mensajes
  for update to authenticated
  using (
    autor_id <> auth.uid()
    and exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid() or q.contacto_id = auth.uid() or lxp.es_docente_o_mas())
    )
  )
  with check (
    autor_id <> auth.uid()
    and exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid() or q.contacto_id = auth.uid() or lxp.es_docente_o_mas())
    )
  );
