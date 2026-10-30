-- ═══════════════════════════════════════════════════════════════════════════
-- 0095 · Escala de calificación de Eco: 0-100 → 0-10 NATIVO (§7A/§13)
-- Campus Virtual LXP · Médica Capacitación
--
-- Decisión de producto: Eco califica en 0-10, igual que el resto del sistema de
-- entregas (la consola, calificarEntrega, el lado alumno y el seed ya son 0-10). El
-- pipeline producía 0-100 y la UI dividía /10 para mostrar — eso se elimina en el
-- código; aquí se ataca la BD:
--
--   (1) El PROMPT DEL JUEZ vive en la FILA VIVA de `lxp.eco_config` (no en código):
--       hoy (version 2) pide a Sonnet nota_sugerida/puntaje en 0-100. Este UPDATE
--       reescribe el `system_prompt` para pedir 0-10 y sube `version`. SIN esto, el
--       código pasa a `max(10)` en el schema del juicio y Eco se APAGA (rechaza todo
--       juicio 0-100 que emita el modelo con el prompt viejo). Es UPDATE a la fila
--       ACTIVA, no solo al default de la migración 0016 (que ya está aplicada y no se
--       puede editar).
--
--   (2) RED DE SEGURIDAD: CHECK (0-10) en las columnas de nota para que un cambio
--       parcial futuro NO corrompa en silencio (numeric(5,2) admitía 0-100 sin queja).
--       Datos verificados sin filas fuera de rango (local y prod: 0 propuestas, 0
--       sesiones de simulador, entregas.nota ≤ 10 por el candado 0-10 de la consola).
--
-- No crea tablas → sin GRANT. Corre en local y en Supabase (prod = paso aparte).
-- ═══════════════════════════════════════════════════════════════════════════

-- (1) Fila VIVA del prompt de evaluación → escala 0-10 (sube version).
update lxp.eco_config
set system_prompt = $sys$Eres Eco, el asistente de evaluación clínica del Campus Virtual LXP de Médica Capacitación (ultrasonido diagnóstico y POCUS).

Tu tarea: comparar la RESPUESTA de un alumno contra la VERDAD ESTRUCTURADA del caso y la RÚBRICA, y proponer una evaluación. Eres un COPILOTO: propones, el docente decide. Nunca afirmes que una nota queda asentada.

Reglas:
- Evalúa solo con base en la verdad y la rúbrica dadas; no inventes hallazgos.
- Sé conservador: si la evidencia es ambigua o insuficiente, baja tu confianza.
- Responde SIEMPRE con UN ÚNICO objeto JSON válido, sin texto alrededor, con la forma:
  {"nota_sugerida": number(0-10), "confianza": number(0-1), "feedback_borrador": string, "criterios": [{"criterio": string, "puntaje": number(0-10), "comentario": string}], "omisiones": [string]}
- La nota y los puntajes van en escala 0 a 10 (un decimal está bien; p. ej. 7.5).
- "confianza" refleja qué tan seguro estás de tu propia evaluación (1 = certeza, 0 = adivinanza).
- El feedback va dirigido al alumno, en voz activa y tono formativo.$sys$,
    version = version + 1,
    updated_at = now()
where nombre = 'evaluacion-default';

-- (2) Red de seguridad: la nota/puntaje de Eco nunca fuera de 0-10.
alter table lxp.eco_propuestas
  add constraint eco_propuestas_nota_0_10
  check (nota_sugerida is null or nota_sugerida between 0 and 10);

alter table lxp.sesiones_simulador
  add constraint sesiones_simulador_puntaje_0_10
  check (puntaje is null or puntaje between 0 and 10);

alter table lxp.entregas
  add constraint entregas_nota_0_10
  check (nota is null or nota between 0 and 10);

-- Sincroniza el comentario de la columna (el de 0016 decía "escala 0..100"; esa
-- migración ya está aplicada y no se edita — se corrige aquí).
comment on column lxp.eco_propuestas.nota_sugerida is
  'Nota sugerida por Eco en escala 0..10 (nativa · §13, mig 0095). BORRADOR: no es una '
  'nota asentada — eso lo hace CorreccionesService al confirmar. NULL si Eco no pudo juzgar.';
