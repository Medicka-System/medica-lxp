-- ═══════════════════════════════════════════════════════════════════════════
-- 0036 · Inscripción REAL al GRUPO (no al programa) — vínculo CORA↔LXP + membresía
--
-- Corrige la "inscripción falsa": hasta ahora el alumno se trataba como inscrito al
-- PROGRAMA (heurística de actividad) y el grupo se resolvía con `limit 1`. El modelo
-- correcto (§1/§6): el alumno se inscribe al GRUPO (instancia del programa: docente,
-- fechas, compañeros, overrides). La membresía la POSEE CORA (`public.inscripciones`
-- → `public.grupos`); el LXP SOLO la LEE vía `lxp.cora_grupos_de` (§10, regla 4).
--
-- Este archivo:
--   1. `lxp.grupos.cora_grupo_id` — vínculo POR VALOR a public.grupos.id (NO FK
--      cross-schema; no acopla tablas · §10). Lo puebla CORA/seed, el LXP no lo escribe.
--   2. `lxp.mis_grupos_lxp()` / `lxp.es_miembro_grupo()` — helpers SECURITY DEFINER
--      (mismo patrón que es_staff/acceso_activo de 0001) que resuelven los grupos LXP
--      del usuario a partir de su inscripción CORA.
--   3. Endurece la RLS del FORO (cerrado por grupo · §1) y de ENTREGAS a membresía real.
--
-- Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3). En el Sprint 11 solo
-- cambia la FUENTE de la membresía (CORA real); la lógica de aquí queda correcta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Vínculo por valor a la inscripción de CORA (solo lectura desde el LXP) ──
alter table lxp.grupos add column if not exists cora_grupo_id uuid;
create index if not exists grupos_cora_idx on lxp.grupos (cora_grupo_id);
comment on column lxp.grupos.cora_grupo_id is
  'Vínculo POR VALOR a public.grupos.id (CORA). Solo lectura desde el LXP; lo puebla '
  'CORA (seed en local). NO es FK cross-schema — no acopla tablas entre esquemas (§10).';

-- ── 2 · Helpers de membresía (SECURITY DEFINER · STABLE · search_path fijo) ──
-- Grupos LXP del usuario actual = sus grupos CORA (cora_grupos_de) mapeados a lxp.grupos.
create or replace function lxp.mis_grupos_lxp()
returns setof uuid language sql stable security definer
set search_path = lxp, public as $$
  select g.id
  from lxp.grupos g
  join lxp.cora_grupos_de(auth.uid()) cg on cg.grupo_id = g.cora_grupo_id;
$$;

-- ¿El usuario actual pertenece a este grupo LXP? El staff pasa siempre (modera/evalúa).
create or replace function lxp.es_miembro_grupo(p_grupo uuid)
returns boolean language sql stable security definer
set search_path = lxp, public as $$
  select lxp.es_staff()
     or (p_grupo is not null and p_grupo in (select lxp.mis_grupos_lxp()));
$$;

grant execute on function lxp.mis_grupos_lxp(), lxp.es_miembro_grupo(uuid)
  to authenticated, service_role;

-- ── 3 · FORO cerrado por grupo — endurecer a membresía real (reemplaza 0030/0010) ──
-- El alumno ve lo suyo SIEMPRE; lo ajeno SOLO si es miembro del grupo Y ya publicó su
-- post raíz (gate de desbloqueo de 0030, ahora acotado por cohorte). Staff ve todo.
drop policy if exists foro_select on lxp.foro_mensajes;
create policy foro_select on lxp.foro_mensajes
  for select to authenticated
  using (
    lxp.es_staff()
    or autor_id = auth.uid()
    or (lxp.es_miembro_grupo(grupo_id) and lxp.foro_ya_publico(actividad_id, grupo_id))
  );

-- Solo se publica en el grupo del que se es miembro (staff exento: modera cualquiera).
drop policy if exists foro_insert on lxp.foro_mensajes;
create policy foro_insert on lxp.foro_mensajes
  for insert to authenticated
  with check (
    lxp.es_staff()
    or (autor_id = auth.uid() and lxp.acceso_activo() and lxp.es_miembro_grupo(grupo_id))
  );

-- ── 4 · ENTREGAS — filtrar por grupo (no se entrega en la cohorte de otro) ──
-- `entregas.grupo_id` es NULLABLE (0003): se permite null (alumno sin cohorte mapeada,
-- resiliencia en transición), pero NUNCA un grupo ajeno. Staff exento.
drop policy if exists entregas_insert on lxp.entregas;
create policy entregas_insert on lxp.entregas
  for insert to authenticated
  with check (
    lxp.es_staff()
    or (
      id_alumno = auth.uid() and lxp.acceso_activo()
      and (grupo_id is null or lxp.es_miembro_grupo(grupo_id))
    )
  );

drop policy if exists entregas_update on lxp.entregas;
create policy entregas_update on lxp.entregas
  for update to authenticated
  using (id_alumno = auth.uid() or lxp.es_docente_o_mas())
  with check (
    lxp.es_docente_o_mas()
    or (id_alumno = auth.uid() and (grupo_id is null or lxp.es_miembro_grupo(grupo_id)))
  );
