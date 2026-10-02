-- ═══════════════════════════════════════════════════════════════════════════
-- 0068 · Contenido/estructura — mínimo privilegio por inscripción (M-1 · auditoría RLS)
-- Campus Virtual LXP · Médica Capacitación
--
-- Antes: modulos/lecciones/contenidos/bloques/actividades con SELECT `using(true)` →
-- cualquier autenticado veía TODO (incl. borradores y programas en los que NO está
-- inscrito). Ahora: el STAFF ve todo; el ALUMNO ve solo contenido de un programa
-- PUBLICADO en el que está inscrito (vía un grupo CORA · reusa mis_grupos_lxp/
-- es_miembro_grupo · 0036). `rubricas` (catálogo reutilizable) → el alumno solo ve las
-- PUBLICADAS. `recursos` (biblioteca) → visible si está EMBEBIDO en un bloque que el
-- alumno puede ver (hereda el gate de la lección vía RLS anidada). El contenido NO se
-- rompe: las queries del campus ya filtran por programa publicado y resuelven la
-- inscripción con los mismos helpers. Solo esquema `lxp`; jamás public/auth (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: ¿veo el contenido de este programa? (publicado + inscrito en un grupo suyo, o staff)
create or replace function lxp.programa_visible_para_mi(p_programa uuid)
returns boolean language sql stable security definer set search_path = lxp, public as $$
  select lxp.es_staff() or (
    exists (select 1 from lxp.programas p
            where p.id = p_programa and p.estado = 'publicado'::lxp.estado_publicacion)
    and exists (select 1 from lxp.grupos g
                where g.programa_id = p_programa and g.id in (select lxp.mis_grupos_lxp()))
  );
$$;
revoke execute on function lxp.programa_visible_para_mi(uuid) from public;
grant execute on function lxp.programa_visible_para_mi(uuid) to authenticated, service_role;

-- Helper: ¿veo esta lección? (sube lección→módulo→programa; definer evita depender de
-- la RLS anidada de modulos, que ya está gateada por este mismo criterio).
create or replace function lxp.leccion_visible_para_mi(p_leccion uuid)
returns boolean language sql stable security definer set search_path = lxp, public as $$
  select coalesce((
    select lxp.programa_visible_para_mi(m.programa_id)
    from lxp.lecciones l join lxp.modulos m on m.id = l.modulo_id
    where l.id = p_leccion
  ), false);
$$;
revoke execute on function lxp.leccion_visible_para_mi(uuid) from public;
grant execute on function lxp.leccion_visible_para_mi(uuid) to authenticated, service_role;

-- ── Policies de lectura (solo _read; las _write por es_autoria quedan intactas) ──
drop policy if exists modulos_read on lxp.modulos;
create policy modulos_read on lxp.modulos for select to authenticated
  using (lxp.programa_visible_para_mi(programa_id));

drop policy if exists lecciones_read on lxp.lecciones;
create policy lecciones_read on lxp.lecciones for select to authenticated
  using (lxp.leccion_visible_para_mi(id));

drop policy if exists contenidos_read on lxp.contenidos;
create policy contenidos_read on lxp.contenidos for select to authenticated
  using (lxp.leccion_visible_para_mi(leccion_id));

drop policy if exists bloques_read on lxp.bloques;
create policy bloques_read on lxp.bloques for select to authenticated
  using (lxp.leccion_visible_para_mi(leccion_id));

drop policy if exists actividades_read on lxp.actividades;
create policy actividades_read on lxp.actividades for select to authenticated
  using (lxp.leccion_visible_para_mi(leccion_id));

-- rubricas: catálogo reutilizable → el alumno solo ve las PUBLICADAS; staff ve todo.
drop policy if exists rubricas_read on lxp.rubricas;
create policy rubricas_read on lxp.rubricas for select to authenticated
  using (lxp.es_staff() or publicado);

-- recursos: biblioteca → visible si está EMBEBIDO en un bloque que YO puedo ver
-- (la subquery corre bajo bloques_read → hereda el gate de la lección); staff ve todo.
drop policy if exists recursos_read on lxp.recursos;
create policy recursos_read on lxp.recursos for select to authenticated
  using (
    lxp.es_staff()
    or exists (select 1 from lxp.bloques b where (b.config->>'recursoId') = recursos.id::text)
  );
