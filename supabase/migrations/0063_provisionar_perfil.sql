-- ═══════════════════════════════════════════════════════════════════════════
-- 0063 · Auto-provisión de lxp.perfiles en el primer login (§1/§10)
-- Campus Virtual LXP · Médica Capacitación
--
-- La identidad es compartida (mismo auth.users que CORA · §1). Cuando un usuario que
-- CORA ya creó entra por primera vez al LXP, puede que aún no tenga fila en
-- `lxp.perfiles`. Esta función SECURITY DEFINER la crea leyendo CORA vía el puente
-- `lxp.cora_usuario` (regla 4) y escribiendo SOLO en `lxp.perfiles` — el LXP jamás
-- toca public/auth (§10, reglas 1/3). Se llama en el primer request autenticado.
--
-- Reglas de SPLIT: corre en AMBOS destinos (lee cora_usuario, que existe en local via
-- mock y en Supabase via CORA real). IDEMPOTENTE: guard de existencia + `on conflict
-- do nothing` → nunca pisa un rol asignado a mano (p. ej. disenador_instruccional, que
-- NO tiene equivalente en CORA). `acceso_activo` se siembra desde `cora_acceso_activo`.
--
-- Mapeo de rol CORA → rol LXP (CORA rol ∈ super_admin/admin/control_escolar/docente/
-- alumno/asesor; LXP rol ∈ super_admin/admin/docente/disenador_instruccional/alumno):
--   alumno→alumno · docente→docente · admin→admin · super_admin→super_admin ·
--   control_escolar→admin ("admin absorbe control escolar" · §5B) ·
--   asesor/desconocido → sin rol LXP (no se provisiona: no todo staff CORA es del LXP).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.provisionar_perfil()
returns void
language plpgsql security definer set search_path = lxp, public as $$
declare
  v_uid  uuid := auth.uid();
  v_cora record;
  v_rol  lxp.rol;
begin
  if v_uid is null then
    return;
  end if;
  -- Ya tiene perfil → nada que hacer (no pisa roles manuales).
  if exists (select 1 from lxp.perfiles where user_id = v_uid) then
    return;
  end if;
  -- Identidad desde CORA (puente de solo lectura).
  select * into v_cora from lxp.cora_usuario(v_uid);
  if not found then
    return;  -- CORA no lo conoce → no se provisiona
  end if;

  v_rol := case v_cora.rol
    when 'alumno'          then 'alumno'::lxp.rol
    when 'docente'         then 'docente'::lxp.rol
    when 'admin'           then 'admin'::lxp.rol
    when 'super_admin'     then 'super_admin'::lxp.rol
    when 'control_escolar' then 'admin'::lxp.rol
    else null  -- asesor / desconocido → sin acceso LXP
  end;
  if v_rol is null then
    return;
  end if;

  insert into lxp.perfiles (user_id, rol, nombre, email, acceso_activo)
  values (
    v_uid,
    v_rol,
    coalesce(v_cora.nombre, v_cora.email, 'Usuario'),
    v_cora.email,
    lxp.cora_acceso_activo(v_uid)
  )
  on conflict (user_id) do nothing;
end
$$;

grant execute on function lxp.provisionar_perfil() to authenticated, service_role;
