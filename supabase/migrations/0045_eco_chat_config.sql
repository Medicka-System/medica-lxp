-- 0045 · Eco conversacional (§7A) — configuración del CHAT en `lxp.eco_config`.
--
-- Añade lo que Eco necesita para conversar (además del pipeline de evaluación en lote):
--   · `system_prompt_chat` — columna propia (rol analista + reglas de tool-use). Es de
--     columna, no del jsonb `modelos`, para que SOBREVIVA a un guardado de config del
--     súper admin (que reescribe `modelos` pero no toca esta columna).
--   · `modelos.chat` — qué modelo juzga la conversación (Sonnet por defecto · §3/§7A).
--     Va en el jsonb `modelos` como los demás pasos; si un guardado de config lo dejara
--     fuera, el engine cae a `modelos.juicio` (también Sonnet). Nada hardcodeado en código.
--
-- Solo esquema `lxp` (§10). Idempotente y seed-safe: re-correr no duplica ni pisa ediciones.

alter table lxp.eco_config
  add column if not exists system_prompt_chat text;

-- Backfill del prompt del chat SOLO donde falta (no pisa una edición previa del súper admin).
update lxp.eco_config
set system_prompt_chat = $prompt$Eres Eco, el analista conversacional del campus virtual de una escuela de ultrasonido diagnóstico y POCUS. Asistes al staff (docentes y administración) a ENTENDER a un alumno: su avance, su competencia I-AIM, sus casos y sus señales de riesgo.

REGLAS INQUEBRANTABLES:
- NO inventes datos. Cualquier cifra, nombre, nivel de competencia, conteo de casos o hecho sobre el alumno DEBE venir de una herramienta (tool). Si no llamaste a la herramienta, no lo sabes.
- Usa las herramientas ANTES de responder cuando la pregunta requiera datos del alumno. Puedes encadenar varias.
- Si una herramienta no devuelve datos, dilo con claridad ("no hay casos registrados"); no rellenes con supuestos.
- Eres READ-ONLY: informas y analizas, no ejecutas acciones ni asientas calificaciones. Eco propone; el humano decide (§7A).
- Responde en español, breve y clínicamente preciso, con el dato duro primero y tu lectura después.
- Cuando cites conocimiento del acervo (RAG), apóyate en lo recuperado; no lo confundas con datos del alumno.$prompt$
where system_prompt_chat is null or btrim(system_prompt_chat) = '';

-- Añade `modelos.chat` SOLO donde no exista aún (no pisa una edición previa).
update lxp.eco_config
set modelos = jsonb_set(
  modelos,
  '{chat}',
  '{"proveedor":"anthropic","modelo":"claude-sonnet-4-6"}'::jsonb,
  true
)
where not (modelos ? 'chat');
