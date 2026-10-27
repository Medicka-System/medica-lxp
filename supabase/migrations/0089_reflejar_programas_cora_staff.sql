-- ═══════════════════════════════════════════════════════════════════════════
-- 0089 · CORA → Studio: reflejo de PROGRAMAS del lado STAFF (universal · §6/§10)
-- Campus Virtual LXP · Médica Capacitación
--
-- Modelo de negocio: el programa es el MISMO en CRM/CORA/LXP. Nace en CORA y DEBE
-- existir en el LXP para que el diseñador le construya el contenido (módulos/lecciones,
-- que viven solo en `lxp`) — tenga grupo o no, esté activo o no. CORA es dueño del
-- programa (identidad/pagos/alumnos/calendario); el LXP solo le construye/sirve contenido.
--
-- Análogo EXACTO a `reflejar_grupos_cora_staff` (mig 0086) pero para PROGRAMAS: materializa
-- un "shell" en `lxp.programas` por cada programa CORA, al que el diseñador luego le agrega
-- contenido. Se corre al tope de la page de Programas del Studio (antes de getProgramasLista),
-- igual que el de grupos se corre al tope de Grupos.
--
-- Diferencia deliberada con 0086: refleja TODOS los programas CORA — SIN filtro de `activo`
-- (los 4 inactivos también deben aparecer para construirles contenido). El `nombre` se
-- toma como SNAPSHOT (ON CONFLICT DO NOTHING no pisa: conserva el nombre/contenido editado).
--
-- Gate de staff CORREGIDO: `if lxp.es_staff() is not true then return` — `es_staff()` puede
-- devolver NULL (sin `auth.uid()`); `is not true` trata NULL como "no-staff" y corta. Evita
-- el bug de 0086 (`if not lxp.es_staff()` no cortaba con NULL → corría sin contexto de auth).
--
-- Read-only total sobre `public`: lee `public.bc_programas` desde una función SECURITY
-- DEFINER gated a STAFF; CERO DDL/escritura en `public`/`auth` (CORA es dueño, no se toca).
-- Solo escribe `lxp.programas` como owner. Idempotente vía el índice UNIQUE parcial ya
-- existente `programas_cora_unico (cora_programa_id) WHERE cora_programa_id IS NOT NULL`.
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.reflejar_programas_cora_staff()
returns void
language plpgsql security definer set search_path = lxp, public as $$
begin
  -- Solo staff (el web ya gatea con requireAutoria; este es el segundo candado).
  -- `is not true` corta también cuando es_staff() es NULL (sin auth.uid), a diferencia de 0086.
  if lxp.es_staff() is not true then
    return;
  end if;

  -- TODOS los programas CORA (activos E inactivos) → shell en lxp.programas. Sin filtro de
  -- `activo`: el programa existe en el LXP porque existe en CORA, no porque esté activo.
  insert into lxp.programas (nombre, cora_programa_id, cora_programa_slug)
  select bp.nombre_programa, bp.id, bp.identificador
  from public.bc_programas bp
  on conflict (cora_programa_id) where cora_programa_id is not null
  do nothing;                              -- ya reflejado → no duplica ni pisa lo editado
end
$$;

-- Mínimo privilegio (patrón 0086): sin anon/public; lo consume el Studio (staff).
revoke execute on function lxp.reflejar_programas_cora_staff() from public;
grant execute on function lxp.reflejar_programas_cora_staff() to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop function if exists lxp.reflejar_programas_cora_staff();
-- ═══════════════════════════════════════════════════════════════════════════
