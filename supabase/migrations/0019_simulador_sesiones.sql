-- ═══════════════════════════════════════════════════════════════════════════
-- 0019 · Simuladores IA: persistencia de SESIONES (§7A · Sprint 7)
--
-- Los entrenadores IA practican contra el BANCO CURADO (`lxp.casos_biblioteca`,
-- 0005) y evalúan con Eco (§7A). El CATÁLOGO y la config viven ya en 0005
-- (`lxp.simuladores` + `lxp.casos_biblioteca`, con su VERDAD ESTRUCTURADA). Lo
-- único que falta es dónde REGISTRAR cada intento del alumno: esta migración
-- añade `lxp.sesiones_simulador` — una fila por intento evaluado, que alimenta el
-- progreso previo del catálogo, el desempeño y los repasos (§1/§8).
--
-- Frontera de capas (§2): la sesión se EVALÚA en `api/src/ai` (juicio de Eco) y se
-- ESCRIBE ahí con service_role (como `eco_propuestas`). El alumno la LEE bajo RLS
-- (su historial). No es proxy de CRUD: el asiento de la evaluación es dominio (LLM).
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3). RLS obligatoria.
-- ═══════════════════════════════════════════════════════════════════════════

-- Estado del intento: nace `evaluada` (Eco ya juzgó al persistir). Se deja el enum
-- abierto a `en_curso` por si a futuro se persiste el borrador antes de enviar.
create type lxp.sesion_simulador_estado as enum ('en_curso', 'evaluada');

-- ── sesiones_simulador: un intento del alumno contra un caso del banco ──────────
create table lxp.sesiones_simulador (
  id                  uuid primary key default gen_random_uuid(),
  id_alumno           uuid not null references lxp.perfiles(user_id) on delete cascade,
  -- Config del simulador usada (opcional: el catálogo puede salir directo del banco).
  simulador_id        uuid references lxp.simuladores(id) on delete set null,
  -- Caso del banco curado sobre el que se practicó (la VERDAD contra la que Eco evaluó).
  caso_biblioteca_id  uuid references lxp.casos_biblioteca(id) on delete set null,
  tipo                lxp.simulador_tipo not null,               -- interpretacion | reporte
  dominio_iaim        lxp.dominio_iaim,                          -- para competencia/repaso
  estado              lxp.sesion_simulador_estado not null default 'evaluada',

  -- Lo que respondió el alumno (hallazgos+impresión, o secciones del reporte) tal cual.
  respuesta           jsonb not null default '{}'::jsonb,
  -- Feedback de Eco (BORRADOR de práctica, no una nota curricular): puntaje, aciertos,
  -- omisiones, precisiones, traza del pipeline. Eco propone; aquí no se asienta nada
  -- en el expediente del alumno (§7A) — es entrenamiento, no evaluación oficial.
  evaluacion          jsonb not null default '{}'::jsonb,
  -- Puntaje 0..100 de la práctica (desnormalizado de `evaluacion` para agregados rápidos).
  puntaje             numeric(5,2),

  created_at          timestamptz not null default now(),
  evaluada_en         timestamptz
);

create index sesiones_simulador_alumno_idx
  on lxp.sesiones_simulador (id_alumno, created_at desc);
create index sesiones_simulador_caso_idx
  on lxp.sesiones_simulador (caso_biblioteca_id);

comment on table lxp.sesiones_simulador is
  'Intentos del alumno en los simuladores IA (§7A · Sprint 7). Práctica, no '
  'evaluación oficial: el feedback de Eco es formativo. Alimenta progreso previo, '
  'desempeño y repaso espaciado. La escribe el `api` (service_role); el alumno la lee.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants (0010 solo cubrió las tablas de entonces; el `grant on all` no es
-- retroactivo · §6/§10).
-- ═══════════════════════════════════════════════════════════════════════════
grant select, insert, update, delete on lxp.sesiones_simulador to authenticated;
grant all on lxp.sesiones_simulador to service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table lxp.sesiones_simulador enable row level security;

-- El alumno solo ve/inserta lo SUYO y con `acceso_activo`; el staff ve todo
-- (seguimiento). Mismo patrón que `entregas`/`reproduccion_progreso` (0010/0017).
-- En la práctica el `api` (service_role) es quien inserta al evaluar; la policy de
-- insert existe para el borrador `en_curso` que pudiera escribir el alumno directo.
create policy sesiones_simulador_select on lxp.sesiones_simulador
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());
create policy sesiones_simulador_insert on lxp.sesiones_simulador
  for insert to authenticated
  with check (id_alumno = auth.uid() and lxp.acceso_activo());
create policy sesiones_simulador_update on lxp.sesiones_simulador
  for update to authenticated
  using (id_alumno = auth.uid() and lxp.acceso_activo())
  with check (id_alumno = auth.uid() and lxp.acceso_activo());
