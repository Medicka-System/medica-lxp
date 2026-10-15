-- ═══════════════════════════════════════════════════════════════════════════
-- 0082 · PUENTE 1 — vínculo automático grupos+programas CORA↔LXP (Fase A)
-- (el mock académico local que habilita esto vive en 0081_cora_mock_academico · SOLO_LOCAL)
-- Campus Virtual LXP · Médica Capacitación
--
-- El diseñador liga UNA VEZ cada programa de contenido del LXP a su programa de
-- CORA (`public.bc_programas`). De ahí, TODO grupo que CORA abra sobre ese programa
-- se refleja solo en el LXP: `lxp.grupos` con `cora_grupo_id` + `programa_id`
-- resueltos. "Mis Cursos" pasa a mostrar SOLO los cursos reales del alumno.
--
-- Modelo CORA verificado por introspección read-only (2026-10-15):
--   public.bc_programas(id uuid PK, identificador text UNIQUE, nombre_programa, activo…)
--   public.grupos(id, programa_id → bc_programas.id POR VALOR, nombre, modalidad,
--                 fecha_inicio, fecha_fin…)   — integridad 100% en datos (54/54 grupos).
-- `grupos.programa_id`/`modulos.programa_id`/`clases.programa_id` NO son FK formales
-- en CORA; son referencias POR VALOR a bc_programas.id. El LXP replica ese patrón:
-- vínculo por valor + lectura vía funciones SECURITY DEFINER de solo lectura (§10).
--
-- §10: SOLO esquema `lxp`. Lee `public` (CORA) read-only desde cuerpos de funciones
-- definer; CERO DDL/RLS sobre `public`; jamás escribe en `public`/`auth`. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Vínculo POR VALOR del programa LXP a su programa CORA ──────────────────
alter table lxp.programas add column if not exists cora_programa_id uuid;
alter table lxp.programas add column if not exists cora_programa_slug text;

comment on column lxp.programas.cora_programa_id is
  'Vínculo POR VALOR a public.bc_programas.id (CORA). Lo liga el diseñador UNA VEZ '
  '(acción Studio). NO es FK cross-schema — no acopla tablas entre esquemas (§10). '
  'Null = programa aún sin ligar → sus grupos CORA quedan "contenido pendiente".';
comment on column lxp.programas.cora_programa_slug is
  'public.bc_programas.identificador (slug estable y legible, p. ej. '
  '"diplomado_gineco_1000_presencial"). Solo legibilidad/trazabilidad; la resolución '
  'usa cora_programa_id.';

create index if not exists programas_cora_idx on lxp.programas (cora_programa_id);

-- Un programa CORA se liga a lo sumo a UN programa LXP (resolución determinista del
-- reflejo). Parcial: ignora los no-ligados (null). Aditivo; no afecta datos previos.
create unique index if not exists programas_cora_unico
  on lxp.programas (cora_programa_id) where cora_programa_id is not null;

-- Un grupo CORA se refleja en a lo sumo UNA fila POR PROGRAMA (clave del upsert
-- idempotente del reflejo). En el camino real un grupo CORA resuelve a UN solo
-- programa LXP vía su vínculo → de hecho una fila por grupo; la clave compuesta además
-- tolera fixtures que materializan el mismo cora_grupo_id en programas distintos.
-- Parcial: ignora las filas no reflejadas (cora_grupo_id null).
create unique index if not exists grupos_cora_unico
  on lxp.grupos (cora_grupo_id, programa_id) where cora_grupo_id is not null;

-- ── 2 · Catálogo CORA para el selector del diseñador (read-only, académico) ────
-- Expone SOLO lo académico de bc_programas (id, identificador, nombre). NUNCA las
-- columnas comerciales/financieras (precios, becas, parcialidades…). Activos primero.
create or replace function lxp.cora_programas_catalogo()
returns table (id uuid, identificador text, nombre_programa text)
language sql stable security definer set search_path = lxp, public as $$
  select p.id, p.identificador, p.nombre_programa
  from public.bc_programas p
  where coalesce(p.activo, true)
  order by p.nombre_programa;
$$;

-- ── 3 · Reflejo automático e idempotente de los grupos CORA del usuario ────────
-- Para auth.uid(): por cada grupo CORA del usuario (reusa cora_grupos_de), si el
-- programa CORA del grupo YA está ligado a un lxp.programa (cora_programa_id), hace
-- UPSERT en lxp.grupos con cora_grupo_id + programa_id resueltos. Si el programa NO
-- está ligado, el grupo se OMITE (no se materializa): queda "contenido pendiente"
-- (ver mis_grupos_cora_pendientes), nunca inscripción falsa.
--
-- Idempotente: unique parcial (cora_grupo_id, programa_id) → correrlo N veces no
-- duplica (ON CONFLICT DO NOTHING). Los campos CORA (nombre/modalidad/fechas) se fijan
-- al materializar; no se re-pisan en corridas posteriores, preservando lo que el staff
-- editó del grupo reflejado (docente/portada/overrides). SECURITY DEFINER: escribe
-- lxp.grupos como owner (bypassa la RLS es_autoria, que es para la edición manual del
-- staff); el límite de seguridad es la función, no la sesión.
create or replace function lxp.reflejar_grupos_cora()
returns void
language plpgsql security definer set search_path = lxp, public as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, fecha_fin, cora_grupo_id)
  select
    lp.id,
    cg.nombre,
    -- CORA modalidad (online|presencial|hibrida) → lxp.modalidad (sincrono|asincrono).
    -- online = asíncrono; presencial/híbrida/null = síncrono (clase en vivo).
    (case when g.modalidad = 'online' then 'asincrono' else 'sincrono' end)::lxp.modalidad,
    g.fecha_inicio,
    g.fecha_fin,
    g.id
  from lxp.cora_grupos_de(auth.uid()) cg
  join public.grupos g on g.id = cg.grupo_id
  join public.bc_programas bp on bp.id = g.programa_id
  join lxp.programas lp on lp.cora_programa_id = bp.id      -- SOLO si el programa está ligado
  on conflict (cora_grupo_id, programa_id) where cora_grupo_id is not null
  do nothing;                                              -- ya reflejado → no duplica ni pisa overrides
end
$$;

-- ── 4 · Grupos CORA del usuario cuyo programa AÚN no está ligado (pendientes) ──
-- "Contenido pendiente": el alumno está inscrito en CORA, pero el diseñador todavía
-- no ligó ese programa a contenido LXP. Mis Cursos lo muestra como pendiente — NO
-- como curso con contenido ni como catálogo.
create or replace function lxp.mis_grupos_cora_pendientes()
returns table (cora_grupo_id uuid, grupo_nombre text, programa_nombre text)
language sql stable security definer set search_path = lxp, public as $$
  select g.id, g.nombre, bp.nombre_programa
  from lxp.cora_grupos_de(auth.uid()) cg
  join public.grupos g on g.id = cg.grupo_id
  join public.bc_programas bp on bp.id = g.programa_id
  where not exists (
    select 1 from lxp.programas lp where lp.cora_programa_id = bp.id
  )
  order by bp.nombre_programa;
$$;

-- ── Grants (mínimo privilegio · patrón 0065) ──
revoke execute on function lxp.cora_programas_catalogo()       from public;
revoke execute on function lxp.reflejar_grupos_cora()          from public;
revoke execute on function lxp.mis_grupos_cora_pendientes()    from public;
-- Catálogo: lo consume el Studio (autoría). Reflejo/pendientes: el resolvedor del alumno.
grant execute on function lxp.cora_programas_catalogo()        to authenticated, service_role;
grant execute on function lxp.reflejar_grupos_cora()           to authenticated, service_role;
grant execute on function lxp.mis_grupos_cora_pendientes()     to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop function if exists lxp.mis_grupos_cora_pendientes();
--   drop function if exists lxp.reflejar_grupos_cora();
--   drop function if exists lxp.cora_programas_catalogo();
--   drop index if exists lxp.grupos_cora_unico;
--   drop index if exists lxp.programas_cora_unico;
--   drop index if exists lxp.programas_cora_idx;
--   alter table lxp.programas drop column if exists cora_programa_slug;
--   alter table lxp.programas drop column if exists cora_programa_id;
-- ═══════════════════════════════════════════════════════════════════════════
