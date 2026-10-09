-- ═══════════════════════════════════════════════════════════════════════════
-- 0077 · Provisión de perfil REUSABLE (un solo mapeo) + candados sin rol fantasma
-- Campus Virtual LXP · Médica Capacitación   (fix P9 — estructura de origen)
--
-- (1) El CORE de la auto-provisión pasa a `lxp.provisionar_perfil_de(p_uid uuid)`:
--     lee CORA (cora_usuario) + el ÚNICO case de mapeo + insert on conflict do nothing.
--     `lxp.provisionar_perfil()` queda como WRAPPER delgado → provisionar_perfil_de(auth.uid()).
--     El mapeo CORA→LXP vive en UN SOLO LUGAR (dentro de provisionar_perfil_de). No cambia:
--       alumno→alumno · docente→docente · admin→admin · super_admin→super_admin ·
--       control_escolar→admin · asesor/desconocido → (sin perfil).
--
-- (2) Candados reflejan la REALIDAD (no reservar un rol que nadie tiene y que el mapeo
--     nunca produce): se quita `disenador_instruccional` de es_autoria() y es_staff().
--       es_autoria() = rol_actual() in ('super_admin','admin')
--       es_staff()   = rol_actual() in ('super_admin','admin','docente')
--     El VALOR del enum lxp.rol se conserva (quitarlo del type es invasivo); solo sale de
--     los predicados. Otras referencias a disenador_instruccional NO se tocan aquí.
--
-- Solo esquema `lxp`; jamás `public`/`auth` de CORA (§10). Idempotente (create or replace).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── (1) Core reusable de provisión ──
create or replace function lxp.provisionar_perfil_de(p_uid uuid)
returns void
language plpgsql security definer set search_path = lxp, public as $$
declare
  v_cora record;
  v_rol  lxp.rol;
begin
  if p_uid is null then
    return;
  end if;
  -- Ya tiene perfil → nada que hacer (no pisa roles asignados a mano).
  if exists (select 1 from lxp.perfiles where user_id = p_uid) then
    return;
  end if;
  -- Identidad desde CORA (puente de solo lectura · 0009).
  select * into v_cora from lxp.cora_usuario(p_uid);
  if not found then
    return;  -- CORA no lo conoce → no se provisiona
  end if;

  -- ÚNICO lugar del mapeo CORA→LXP (ningún otro sitio lo reimplementa).
  v_rol := case v_cora.rol
    when 'alumno'          then 'alumno'::lxp.rol
    when 'docente'         then 'docente'::lxp.rol
    when 'admin'           then 'admin'::lxp.rol
    when 'super_admin'     then 'super_admin'::lxp.rol
    when 'control_escolar' then 'admin'::lxp.rol       -- "admin absorbe control escolar" (§5B)
    else null                                          -- asesor / desconocido → sin acceso LXP
  end;
  if v_rol is null then
    return;
  end if;

  insert into lxp.perfiles (user_id, rol, nombre, email, acceso_activo)
  values (
    p_uid,
    v_rol,
    coalesce(v_cora.nombre, v_cora.email, 'Usuario'),
    v_cora.email,
    lxp.cora_acceso_activo(p_uid)
  )
  on conflict (user_id) do nothing;
end
$$;
revoke execute on function lxp.provisionar_perfil_de(uuid) from public;
grant execute on function lxp.provisionar_perfil_de(uuid) to authenticated, service_role;

-- Wrapper delgado: el perfil del usuario ACTUAL (auth.uid()). Mismo contrato que 0063.
create or replace function lxp.provisionar_perfil()
returns void
language sql security definer set search_path = lxp, public as $$
  select lxp.provisionar_perfil_de(auth.uid());
$$;
grant execute on function lxp.provisionar_perfil() to authenticated, service_role;

-- ── (2) Candados sin rol fantasma ──
create or replace function lxp.es_autoria()
returns boolean
language sql stable security definer set search_path = lxp, public as $$
  select lxp.rol_actual() in ('super_admin', 'admin');
$$;

create or replace function lxp.es_staff()
returns boolean
language sql stable security definer set search_path = lxp, public as $$
  select lxp.rol_actual() in ('super_admin', 'admin', 'docente');
$$;

-- ── ROLLBACK (manual) ──
-- -- Restaurar el core como función monolítica (0063) y los candados con el rol fantasma (0001):
-- create or replace function lxp.provisionar_perfil() returns void
--   language plpgsql security definer set search_path = lxp, public as $$
--   declare v_uid uuid := auth.uid(); v_cora record; v_rol lxp.rol; begin
--     if v_uid is null then return; end if;
--     if exists (select 1 from lxp.perfiles where user_id = v_uid) then return; end if;
--     select * into v_cora from lxp.cora_usuario(v_uid); if not found then return; end if;
--     v_rol := case v_cora.rol when 'alumno' then 'alumno'::lxp.rol when 'docente' then 'docente'::lxp.rol
--       when 'admin' then 'admin'::lxp.rol when 'super_admin' then 'super_admin'::lxp.rol
--       when 'control_escolar' then 'admin'::lxp.rol else null end;
--     if v_rol is null then return; end if;
--     insert into lxp.perfiles (user_id, rol, nombre, email, acceso_activo)
--     values (v_uid, v_rol, coalesce(v_cora.nombre, v_cora.email, 'Usuario'), v_cora.email, lxp.cora_acceso_activo(v_uid))
--     on conflict (user_id) do nothing; end $$;
-- drop function if exists lxp.provisionar_perfil_de(uuid);
-- create or replace function lxp.es_autoria() returns boolean language sql stable security definer
--   set search_path = lxp, public as $$ select lxp.rol_actual() in ('super_admin','admin','disenador_instruccional'); $$;
-- create or replace function lxp.es_staff() returns boolean language sql stable security definer
--   set search_path = lxp, public as $$ select lxp.rol_actual() in ('super_admin','admin','docente','disenador_instruccional'); $$;
