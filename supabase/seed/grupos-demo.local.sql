-- ═══════════════════════════════════════════════════════════════════════════
-- grupos-demo.local.sql · [SOLO_LOCAL] Fixture de verificación de Studio · Grupos (19a)
-- Campus Virtual LXP · Médica Capacitación
--
-- ⚠️ SOLO LOCAL. NUNCA aplicar a Supabase/producción: escribe en el MOCK de `public`
--    (bc_programas / grupos) que solo existe en la BD local (migs 0009/0081, SOLO_LOCAL).
--    En producción esas tablas son de CORA y el LXP jamás las escribe (§10). El runner
--    de migraciones NO ejecuta este archivo; se corre a mano con psql (ver abajo).
--
-- Propósito: dejar la lista de Grupos del Studio con TODOS los estados visibles de una
-- sola pasada, para recorrer la UI (portada/estado/docente/overrides/alumnos/⋯Borrar) y
-- para comprobar la migración 0086 (reflejo del lado staff de grupos CORA vacíos/próximos
-- que el flujo del alumno nunca materializaría).
--
-- Requisitos previos (en LOCAL):
--   1) Postgres local arriba (contenedor `campus-lxp-postgres-1`, :5432).
--   2) Migraciones aplicadas incl. 0086:
--        DATABASE_URL='postgresql://lxp:lxp_dev_password@127.0.0.1:5432/campus_lxp' \
--        DIRECT_URL='postgresql://lxp:lxp_dev_password@127.0.0.1:5432/campus_lxp' \
--        MIGRATION_TARGET=local ENV_FILE= pnpm --filter db migrate:up
--   3) Seed corrido:  (misma línea de env)  pnpm --filter db seed
--
-- Cómo aplicarlo (idempotente; se puede re-correr tras cada seed):
--   docker exec -i campus-lxp-postgres-1 psql -U lxp -d campus_lxp -v ON_ERROR_STOP=1 \
--     < supabase/seed/grupos-demo.local.sql
--
-- Qué deja (6 filas en lxp.grupos; la page las ve bajo sesión staff dev admin-studio):
--   · Demo 2026-A / 2026-B        → reflejados CORA (sin ⋯), En curso, 4 / 1 alumnos (2026-B asíncrono → Fechas "—")
--   · Grupo Renal · 2026          → nativo (⋯Borrar), En curso, con docente              [lo crea el seed]
--   · Grupo Nativo · Piloto 2027  → nativo (⋯Borrar), PRÓXIMO, "Sin asignar" ámbar, "Personalizado · 2 cambios"
--   · Grupo Nativo · Cohorte 2024 → nativo (⋯Borrar), FINALIZADO, con docente, "Estándar", 0 alumnos "—"
--   · POCUS · Cohorte Ene 2027    → reflejo 0086 (sin ⋯), PRÓXIMO, 0 alumnos, grupo CORA VACÍO
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Estados de grupo + demo de reflejo 0086 (idempotente por nombre/slug) ──────
do $$
declare
  v_prog uuid;
  v_doc  uuid;
  v_nat_a uuid;
  v_bc   uuid;
begin
  -- Programa NATIVO publicado (sobre el que se instancian los grupos nativos de la demo).
  select id into v_prog
    from lxp.programas
    where cora_programa_id is null and publicado
    order by created_at limit 1;
  if v_prog is null then
    raise exception 'No hay programa nativo publicado. Corre el seed antes de este fixture.';
  end if;

  select user_id into v_doc from lxp.perfiles where rol = 'docente' limit 1;

  -- A) Nativo PRÓXIMO (2027), SIN docente (→ "Sin asignar" ámbar) + 2 overrides
  --    (→ Sello "Personalizado · 2 cambios"). entidad_id son uuids de muestra: en la
  --    LISTA solo cuenta el nº de overrides; el detalle resolvería el título del nodo.
  if not exists (select 1 from lxp.grupos where nombre = 'Grupo Nativo · Piloto 2027') then
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, fecha_fin, docente_id)
    values (v_prog, 'Grupo Nativo · Piloto 2027', 'sincrono'::lxp.modalidad, '2027-01-11', '2027-12-17', null)
    returning id into v_nat_a;
    insert into lxp.grupo_overrides (grupo_id, entidad, entidad_id, patch) values
      (v_nat_a, 'modulo',  gen_random_uuid(), '{"oculto":true}'::jsonb),
      (v_nat_a, 'leccion', gen_random_uuid(), '{"nombre":"Lección renombrada en este grupo"}'::jsonb);
  end if;

  -- B) Nativo FINALIZADO (2024), CON docente, 0 alumnos (→ "—"), sin overrides (→ "Estándar")
  if not exists (select 1 from lxp.grupos where nombre = 'Grupo Nativo · Cohorte 2024') then
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, fecha_fin, docente_id)
    values (v_prog, 'Grupo Nativo · Cohorte 2024', 'sincrono'::lxp.modalidad, '2024-02-10', '2024-07-31', v_doc);
  end if;

  -- C) DEMO 0086: programa CORA LIGADO + grupo CORA VACÍO/PRÓXIMO (0 alumnos). El flujo
  --    del alumno jamás lo reflejaría; reflejar_grupos_cora_staff() (que corre la page) sí.
  insert into public.bc_programas (id, identificador, nombre_programa, activo)
  values (gen_random_uuid(), 'demo_cora_pocus_2027', 'POCUS en Urgencias (CORA)', true)
  on conflict (identificador) do nothing;
  select id into v_bc from public.bc_programas where identificador = 'demo_cora_pocus_2027';

  if not exists (select 1 from lxp.programas where cora_programa_slug = 'demo_cora_pocus_2027') then
    insert into lxp.programas (nombre, descripcion, publicado, estado, version, cora_programa_id, cora_programa_slug)
    values ('POCUS en Urgencias (contenido LXP)', 'Ligado a CORA · demo 0086', true,
            'publicado'::lxp.estado_publicacion, 2, v_bc, 'demo_cora_pocus_2027');
  end if;

  if not exists (select 1 from public.grupos where nombre = 'POCUS · Cohorte Ene 2027') then
    insert into public.grupos (nombre, programa_id, modalidad, fecha_inicio, fecha_fin)
    values ('POCUS · Cohorte Ene 2027', v_bc, 'presencial', '2027-01-15', '2027-11-30');
    -- (sin grupo_alumnos → grupo VACÍO)
  end if;
end $$;

-- ── Pre-reflejo del lado staff (idempotente · lo mismo que hace la page al cargar) ──
-- Materializa en lxp.grupos los grupos CORA de programas ligados, para que la verificación
-- por SQL ya muestre "POCUS · Cohorte Ene 2027". Usa claims de un staff real (es_staff()).
do $$
declare v_staff uuid;
begin
  select user_id into v_staff
    from lxp.perfiles
    where rol in ('super_admin', 'admin', 'docente', 'disenador_instruccional')
    limit 1;
  if v_staff is null then
    raise notice 'Sin perfil staff; omito el pre-reflejo (la page lo hará al cargar).';
    return;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform lxp.reflejar_grupos_cora_staff();
  reset role;
end $$;
