-- ═══════════════════════════════════════════════════════════════════════════
-- 0086 · CORA → Studio: reflejo de grupos del lado STAFF (universal · §10)
-- Campus Virtual LXP · Médica Capacitación
--
-- La vista de GRUPOS del Studio es UNIVERSAL: todos los grupos se ven idénticos y
-- cada uno es una fila de `lxp.grupos` (con detalle, overrides y portada). El reflejo
-- del lado del ALUMNO (`lxp.reflejar_grupos_cora` · 0082) solo materializa los grupos
-- del `auth.uid()` que entra a Mis Cursos (keyed a `cora_grupos_de`, que resuelve por
-- `public.estudiantes`). El staff NO es estudiante → ese reflejo no le sirve, y los
-- grupos VACÍOS/PRÓXIMOS (0 alumnos) jamás se reflejarían (no hay alumno que lo dispare).
--
-- Esta función refleja el UNIVERSO visible al staff: TODO grupo CORA cuyo programa esté
-- ligado a un programa LXP (`lxp.programas.cora_programa_id`), sin importar inscripciones.
-- Mismo UPSERT idempotente que 0082 (ON CONFLICT DO NOTHING) → no duplica ni pisa lo que
-- el staff editó del grupo reflejado (docente/portada/overrides). Se corre al tope de la
-- page de Grupos del Studio (antes de getGrupos), igual que el alumno lo corre al abrir
-- Mis Cursos.
--
-- Read-only total sobre `public`: lee `public.grupos` + `public.bc_programas` desde el
-- cuerpo de una función SECURITY DEFINER, gated a STAFF (es_staff evalúa auth.uid() del
-- caller). CERO DDL/RLS sobre `public`; jamás escribe en `public`/`auth`. Solo escribe
-- `lxp.grupos` como owner (bypassa es_autoria, que es para la edición manual del staff);
-- el límite de seguridad es la función, no la sesión. Vínculo POR VALOR (sin FK cross-schema).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.reflejar_grupos_cora_staff()
returns void
language plpgsql security definer set search_path = lxp, public as $$
begin
  -- Solo staff (el web ya gatea con requireAutoria; este es el segundo candado).
  if not lxp.es_staff() then
    return;
  end if;

  insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, fecha_fin, cora_grupo_id)
  select
    lp.id,
    g.nombre,
    -- CORA modalidad (online|presencial|hibrida) → lxp.modalidad (sincrono|asincrono):
    -- online = asíncrono; presencial/híbrida/null = síncrono (clase en vivo). Igual a 0082.
    (case when g.modalidad = 'online' then 'asincrono' else 'sincrono' end)::lxp.modalidad,
    g.fecha_inicio,
    g.fecha_fin,
    g.id
  from public.grupos g
  join public.bc_programas bp on bp.id = g.programa_id
  join lxp.programas lp on lp.cora_programa_id = bp.id       -- SOLO si el programa está ligado
  on conflict (cora_grupo_id, programa_id) where cora_grupo_id is not null
  do nothing;                                                -- ya reflejado → no duplica ni pisa
end
$$;

-- Mínimo privilegio (patrón 0065/0084): sin anon/public; lo consume el Studio (staff).
revoke execute on function lxp.reflejar_grupos_cora_staff() from public;
grant execute on function lxp.reflejar_grupos_cora_staff() to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop function if exists lxp.reflejar_grupos_cora_staff();
-- ═══════════════════════════════════════════════════════════════════════════
