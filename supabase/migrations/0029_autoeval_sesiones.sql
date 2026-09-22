-- ═══════════════════════════════════════════════════════════════════════════
-- 0029 · Sesión de intento de autoevaluación (timer persistido · §5C · mock
--        leccion-autoevaluacion)
--
-- El cuestionario tiene un RELOJ. Para que no se pueda hacer trampa recargando
-- (reiniciar el tiempo), el momento de inicio se PERSISTE: al pulsar "Comenzar" se
-- crea una fila con `iniciado_en = now()`. El cliente calcula el restante contra
-- ese instante — sobrevive recargas y sigue corriendo aunque cierre la pestaña
-- ("el reloj corre mientras la tenga abierta").
--
-- Una fila por (lección, alumno): el intento EN CURSO. Al enviar la autoevaluación
-- se BORRA (el motor la limpia), de modo que el siguiente intento arranca su propio
-- reloj. CRUD del alumno bajo RLS (Regla de Oro §2 — NO pasa por NestJS): es estado
-- del alumno, no dominio.
--
-- Seed-safe / idempotente: `create table if not exists`, `drop policy if exists`
-- antes de crear. Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
--
-- ⚠️ GRANT base OBLIGATORIO (lección de 0020/0021): el `grant on all` de 0010 NO es
-- retroactivo. Sin el grant de tabla, la RLS devuelve "permission denied" y tumbaría
-- las rutas del alumno con 500. Por eso se concede explícito abajo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── autoeval_sesiones ──
create table if not exists lxp.autoeval_sesiones (
  leccion_id  uuid not null references lxp.lecciones(id) on delete cascade,
  alumno_id   uuid not null references lxp.perfiles(user_id) on delete cascade,
  iniciado_en timestamptz not null default now(),
  primary key (leccion_id, alumno_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS + grants — el alumno gestiona SOLO su propia sesión (sin staff)
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.autoeval_sesiones enable row level security;

drop policy if exists autoeval_sesiones_select on lxp.autoeval_sesiones;
create policy autoeval_sesiones_select on lxp.autoeval_sesiones
  for select to authenticated
  using (alumno_id = auth.uid());

drop policy if exists autoeval_sesiones_insert on lxp.autoeval_sesiones;
create policy autoeval_sesiones_insert on lxp.autoeval_sesiones
  for insert to authenticated
  with check (alumno_id = auth.uid());

drop policy if exists autoeval_sesiones_delete on lxp.autoeval_sesiones;
create policy autoeval_sesiones_delete on lxp.autoeval_sesiones
  for delete to authenticated
  using (alumno_id = auth.uid());

-- Grant base (NO retroactivo · fallo de 0020 corregido en 0021). Sin esto → 500.
grant select, insert, delete on lxp.autoeval_sesiones to authenticated;
grant all on lxp.autoeval_sesiones to service_role;
