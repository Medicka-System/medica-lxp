-- 0043 — Eco · Tanda 1 / Paso 1 (§7A): modelos vigentes + telemetría de costo.
-- Quirúrgico: solo esquema lxp. No toca RLS de CORA (public) ni policies existentes.

-- ── (a) Modelos vigentes en la config ACTIVA ────────────────────────────────
-- Clasificador = Haiku 4.5 (id con fecha); Juicio = Sonnet 4.6. La excepción/Opus se
-- deja como está: con 2 modelos no se usa por ahora. No cambia temperatura ni umbral.
update lxp.eco_config
set modelos = jsonb_set(
      jsonb_set(modelos, '{clasificador,modelo}', '"claude-haiku-4-5-20251001"'::jsonb),
      '{juicio,modelo}', '"claude-sonnet-4-6"'::jsonb),
    version = version + 1
where activo;

-- ── (b) Telemetría de costo: UNA fila por llamada al LLM ─────────────────────
-- Observabilidad, NO control (sin cap; la alerta por umbral vive en el api como log).
-- La escribe el api con service_role; RLS habilitada SIN policy = sin acceso
-- anon/authenticated todavía (el panel de costo del admin es un paso posterior).
create table lxp.eco_uso (
  id                  uuid primary key default gen_random_uuid(),
  modelo              text not null,
  paso                text not null,            -- clasificador | juicio | excepcion
  objeto_tipo         text,                     -- caso | entrega (a qué correspondió)
  objeto_id           uuid,
  propuesta_id        uuid references lxp.eco_propuestas(id) on delete set null,
  tokens_entrada      integer not null default 0,
  tokens_salida       integer not null default 0,
  tokens_cache_write  integer not null default 0,
  tokens_cache_read   integer not null default 0,
  costo_usd           numeric(12,6) not null default 0,
  created_at          timestamptz not null default now()
);

create index eco_uso_created_idx on lxp.eco_uso (created_at);
create index eco_uso_objeto_idx on lxp.eco_uso (objeto_tipo, objeto_id);

alter table lxp.eco_uso enable row level security;

comment on table lxp.eco_uso is
  'Telemetria de costo de Eco (§7A): tokens (entrada/salida/cache) y costo por llamada '
  'al LLM. La escribe el api (service_role); RLS on sin policy = sin acceso '
  'anon/authenticated en este paso.';
