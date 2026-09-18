-- ═══════════════════════════════════════════════════════════════════════════
-- 0016 · Eco configurable + bandeja de propuestas (§7A · Sprint 5.3)
--   (1) lxp.eco_config — TODA la configuración de Eco vive en BD, NADA hardcodeado:
--       system prompt, user prompt (template con variables), parámetros (temperatura,
--       max_tokens, umbral de confianza) y QUÉ MODELO usa cada paso del pipeline.
--       Eco LEE su config de aquí; la UI para editarla llega en 5.5.
--   (2) lxp.eco_propuestas — persistencia de la BANDEJA: lo que Eco PRE-analiza,
--       separado por confianza ("listo" vs "requiere criterio"). Nada se asienta
--       sin confirmación humana (§7A): la propuesta es un borrador, no una nota.
--
-- Reusa lxp.documentos_rag y lxp.eco_correcciones (0008). Solo esquema `lxp` (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── (1) eco_config: configuración editable de Eco ──────────────────────────
create table lxp.eco_config (
  id                    uuid primary key default gen_random_uuid(),
  -- Identificador lógico de la config (permite tener varias; una activa a la vez).
  nombre                text not null unique,
  activo                boolean not null default true,

  -- Prompts. El user_prompt es un TEMPLATE con variables {{verdad}}, {{rubrica}},
  -- {{respuesta}} (y las que se agreguen): el pipeline las interpola en tiempo real.
  system_prompt         text not null,
  user_prompt_template  text not null,

  -- Parámetros del LLM.
  temperatura           numeric(3,2) not null default 0.20,
  max_tokens            integer       not null default 1024,

  -- Umbral de confianza (0..1) que separa "listos para confirmar" de "requieren
  -- criterio" en la bandeja (§7A). Configurable por el súper admin.
  umbral_confianza      numeric(3,2) not null default 0.80,

  -- Modelo por PASO del pipeline (§7A): clasificador (Haiku), juicio (Sonnet),
  -- excepcion (Opus). Model-agnóstico: {proveedor, modelo} por paso. Cambiar de
  -- proveedor = editar este jsonb, sin tocar código.
  modelos               jsonb not null default jsonb_build_object(
    'clasificador', jsonb_build_object('proveedor', 'anthropic', 'modelo', 'claude-haiku-4-5'),
    'juicio',       jsonb_build_object('proveedor', 'anthropic', 'modelo', 'claude-sonnet-4-6'),
    'excepcion',    jsonb_build_object('proveedor', 'anthropic', 'modelo', 'claude-opus-4-8')
  ),

  version               integer not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Solo UNA config activa a la vez (la que Eco carga por defecto).
create unique index eco_config_activa_uidx on lxp.eco_config (activo) where activo;

create trigger eco_config_touch
  before update on lxp.eco_config
  for each row execute function lxp.touch_updated_at();

comment on table lxp.eco_config is
  'Configuración editable de Eco (§7A): prompts, parámetros, umbral y modelo por '
  'paso del pipeline. Eco la LEE; nada se hardcodea. Una fila activa a la vez.';

-- ── (2) eco_propuestas: bandeja pre-analizada (borradores, NO notas) ────────
create type lxp.eco_propuesta_objeto as enum ('entrega', 'caso');

-- Clasificación por confianza (§7A): la bandeja separa lo que el docente puede
-- aprobar en lote de lo que debe revisar uno a uno.
create type lxp.eco_confianza as enum ('listo', 'requiere_criterio');

-- Ciclo de vida de la propuesta: nace 'propuesta'; el humano la 'confirma' o
-- 'descarta'. NUNCA salta directo a asentar sin ese paso (§7A).
create type lxp.eco_propuesta_estado as enum ('propuesta', 'confirmada', 'descartada');

create table lxp.eco_propuestas (
  id                uuid primary key default gen_random_uuid(),
  -- A qué objeto pre-analizó Eco (una entrega o un caso de bitácora).
  objeto_tipo       lxp.eco_propuesta_objeto not null,
  objeto_id         uuid not null,
  -- Alumno dueño del objeto (para que el docente filtre por alumno/grupo).
  id_alumno         uuid references lxp.perfiles(user_id) on delete set null,
  grupo_id          uuid references lxp.grupos(id) on delete set null,

  -- Propuesta de Eco (§7A): borrador. La nota sugerida en escala 0..100 (o null si
  -- Eco no se atreve). El feedback es un borrador que el docente edita.
  nota_sugerida     numeric(5,2),
  feedback_borrador text,
  confianza_score   numeric(4,3) not null default 0,   -- 0..1 crudo del pipeline
  clasificacion     lxp.eco_confianza not null,
  -- Traza del pipeline: qué pasos corrieron, qué modelo, qué recuperó el RAG.
  detalle           jsonb not null default '{}'::jsonb,

  estado            lxp.eco_propuesta_estado not null default 'propuesta',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Una propuesta VIGENTE por objeto (re-analizar reemplaza vía ON CONFLICT).
  unique (objeto_tipo, objeto_id)
);

create index eco_propuestas_grupo_idx on lxp.eco_propuestas (grupo_id, clasificacion);
create index eco_propuestas_estado_idx on lxp.eco_propuestas (estado);

create trigger eco_propuestas_touch
  before update on lxp.eco_propuestas
  for each row execute function lxp.touch_updated_at();

comment on table lxp.eco_propuestas is
  'Bandeja de Eco (§7A): pre-análisis separado por confianza. Es un BORRADOR; la '
  'nota/validación solo se asienta con confirmación humana (confirmarPropuesta).';

-- ── Grants (0010 solo cubrió las tablas de entonces; estas son nuevas) ──────
grant select, insert, update, delete on lxp.eco_config, lxp.eco_propuestas to authenticated;
grant all on lxp.eco_config, lxp.eco_propuestas to service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table lxp.eco_config     enable row level security;
alter table lxp.eco_propuestas enable row level security;

-- eco_config es CONFIGURACIÓN DEL SISTEMA (§5B): la lee el staff (Eco corre con
-- service_role, que omite RLS), pero SOLO el súper admin la edita.
create policy eco_config_select on lxp.eco_config
  for select to authenticated using (lxp.es_staff());
create policy eco_config_write on lxp.eco_config
  for all to authenticated
  using (lxp.rol_actual() = 'super_admin')
  with check (lxp.rol_actual() = 'super_admin');

-- eco_propuestas: las escribe Eco (api/worker con service_role). El docente las
-- LEE (su bandeja) y las ACTUALIZA al confirmar/descartar. El alumno NO las ve
-- (es material de evaluación del docente).
create policy eco_propuestas_select on lxp.eco_propuestas
  for select to authenticated using (lxp.es_docente_o_mas());
create policy eco_propuestas_update on lxp.eco_propuestas
  for update to authenticated
  using (lxp.es_docente_o_mas()) with check (lxp.es_docente_o_mas());

-- ── Config semilla: 'evaluacion-default' (config, no dato mock) ─────────────
-- Eco necesita una config para funcionar; esta es la de arranque. La UI del súper
-- admin (5.5) la editará. Prompts en español clínico; devuelve SOLO JSON.
insert into lxp.eco_config (nombre, activo, system_prompt, user_prompt_template)
values (
  'evaluacion-default',
  true,
$sys$Eres Eco, el asistente de evaluación clínica del Campus Virtual LXP de Médica Capacitación (ultrasonido diagnóstico y POCUS).

Tu tarea: comparar la RESPUESTA de un alumno contra la VERDAD ESTRUCTURADA del caso y la RÚBRICA, y proponer una evaluación. Eres un COPILOTO: propones, el docente decide. Nunca afirmes que una nota queda asentada.

Reglas:
- Evalúa solo con base en la verdad y la rúbrica dadas; no inventes hallazgos.
- Sé conservador: si la evidencia es ambigua o insuficiente, baja tu confianza.
- Responde SIEMPRE con UN ÚNICO objeto JSON válido, sin texto alrededor, con la forma:
  {"nota_sugerida": number(0-100), "confianza": number(0-1), "feedback_borrador": string, "criterios": [{"criterio": string, "puntaje": number(0-100), "comentario": string}], "omisiones": [string]}
- "confianza" refleja qué tan seguro estás de tu propia evaluación (1 = certeza, 0 = adivinanza).
- El feedback va dirigido al alumno, en voz activa y tono formativo.$sys$,
$usr$## Verdad estructurada del caso
{{verdad}}

## Rúbrica (criterios y pesos)
{{rubrica}}

## Respuesta del alumno
{{respuesta}}

Evalúa la respuesta contra la verdad y la rúbrica. Devuelve solo el JSON.$usr$
);
