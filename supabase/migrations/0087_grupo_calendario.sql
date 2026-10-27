-- ═══════════════════════════════════════════════════════════════════════════
-- 0087 · Calendario de liberación por MÓDULO × GRUPO (§6 · fecha de apertura)
-- Campus Virtual LXP · Médica Capacitación
--
-- Liberación por fecha: el diseñador fija MANUALMENTE la fecha de apertura de cada
-- módulo PARA UN GRUPO. Antes de esa fecha el alumno VE el módulo pero no entra
-- (bloqueo real, con aviso "se abre el [fecha]"). Reglas de producto:
--   · Fecha ausente (sin fila) ⇒ módulo ABIERTO por defecto (candado de seguridad:
--     nunca bloqueado por omisión). El gating se deriva de fecha PRESENTE y futura.
--   · Solo aplica a grupos SÍNCRONOS (el gating lo decide el consumidor del alumno,
--     que ya conoce la modalidad del grupo); en asíncronos, cero gating.
--   · Es independiente de las PERSONALIZACIONES de contenido (grupo_overrides): una
--     fecha de apertura NO es una excepción sobre la plantilla, así que NO vive en
--     grupo_overrides (no ensucia el conteo de "N personalizaciones" ni el re-sync).
--   · NADA de CORA: las fechas de prácticas/clases vienen del planner de CORA y están
--     FUERA de esta tabla. Aquí SOLO liberación de módulos del contenido LXP.
--
-- Tabla relación módulo×grupo con su fecha. PK compuesta (grupo_id, modulo_id): una
-- fecha por módulo por grupo; upsert la fija/edita, delete la revierte a "abierto".
-- Aditivo: no toca grupo_overrides ni su CHECK; el caso sin filas = idéntico a hoy.
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists lxp.grupo_calendario (
  grupo_id       uuid not null references lxp.grupos(id)   on delete cascade,
  modulo_id      uuid not null references lxp.modulos(id)  on delete cascade,
  fecha_apertura date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (grupo_id, modulo_id)
);

comment on table lxp.grupo_calendario is
  'Fecha de APERTURA por módulo×grupo (liberación · §6). Fija MANUAL del diseñador. '
  'Fila ausente = módulo abierto (default seguro). Solo grupos síncronos la usan (el '
  'gating lo aplica el consumidor del alumno). NO es personalización de contenido '
  '(no vive en grupo_overrides). NADA de CORA (prácticas/clases fuera · §10).';

-- Lookup del gating por grupo (el consumidor trae el calendario del grupo en 1 query).
create index if not exists grupo_calendario_grupo_idx
  on lxp.grupo_calendario (grupo_id);

-- RLS (mismo patrón que grupo_overrides · mig 0010): lectura a cualquier autenticado
-- (el alumno lee el calendario de su grupo para el gating); escritura solo autoría.
alter table lxp.grupo_calendario enable row level security;

create policy grupo_calendario_read on lxp.grupo_calendario
  for select to authenticated using (true);
create policy grupo_calendario_write on lxp.grupo_calendario
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

-- GRANTS de tabla: el bulk `grant ... on all tables in schema lxp` de 0010 NO cubre
-- tablas creadas DESPUÉS (como ésta) → hay que otorgar explícitamente, igual que toda
-- tabla post-0010 (0023/0027/…). RLS es quien restringe de verdad (read=true, write=
-- es_autoria); el grant solo da acceso base. Mismo set que grupos/grupo_overrides.
grant select, insert, update, delete on lxp.grupo_calendario to authenticated;
grant all on lxp.grupo_calendario to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop table if exists lxp.grupo_calendario;
-- ═══════════════════════════════════════════════════════════════════════════
