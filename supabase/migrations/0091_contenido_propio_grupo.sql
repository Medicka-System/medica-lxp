-- ═══════════════════════════════════════════════════════════════════════════
-- 0091 · Contenido PROPIO del grupo (Opción 1A · ETAPA 1: esquema) · §6
-- Campus Virtual LXP · Médica Capacitación
--
-- Modelo: el PROGRAMA es el estándar; el grupo HEREDA (herencia viva, intacta) y además
-- puede AGREGAR contenido propio que afecta SOLO a ese grupo. Lo propio es una FILA REAL
-- en las tablas existentes, tagueada con `grupo_id` → reusa toda la maquinaria (progreso,
-- SCORM, autoeval, foro, entregas, bloques) porque la lección propia ES una lección real.
--
--   grupo_id IS NULL     = HEREDADO (del programa) — comportamiento idéntico al de hoy.
--   grupo_id = <grupo>   = PROPIO de ese grupo.
--
-- ⚠️ ETAPA 1 = SOLO esquema (columnas + índices + posición + RLS). Las LECTURAS del
-- programa (builder de Programas, conteos, resolver) todavía NO filtran `grupo_id IS NULL`
-- (eso es etapa 2+). Como la columna nace NULL, todo lo existente sigue siendo "heredado"
-- y se comporta igual. Aditivo y reversible.
--
-- Tablas tocadas (las que el course builder escribe para los 7 tipos, verificado):
--   · lxp.modulos    (módulo propio del grupo)
--   · lxp.lecciones  (lección propia · 7 tipos)
--   · lxp.bloques    (bloque de teoría propio · 10 sub-tipos)
--   · lxp.contenidos (compat/anchor de h5p/xapi/scorm · lo escribe guardarConfigLeccion + ingesta)
--   · lxp.actividades(tarea/autoevaluación/foro · lo escribe guardarConfigLeccion)
-- NO se toca `public`/CORA. Solo esquema `lxp`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Columna grupo_id (FK → lxp.grupos, cascade) en las 5 tablas ──
alter table lxp.modulos     add column grupo_id uuid references lxp.grupos(id) on delete cascade;
alter table lxp.lecciones   add column grupo_id uuid references lxp.grupos(id) on delete cascade;
alter table lxp.bloques     add column grupo_id uuid references lxp.grupos(id) on delete cascade;
alter table lxp.contenidos  add column grupo_id uuid references lxp.grupos(id) on delete cascade;
alter table lxp.actividades add column grupo_id uuid references lxp.grupos(id) on delete cascade;

-- ── 2) Posición de CONTROL FINO (decisión: puntero `despues_de`, ver nota al pie) ──
-- Una entidad PROPIA se ancla "después de" una entidad HEREDADA hermana (su id). El merge
-- la inserta justo tras ese ancla, EN SU POSICIÓN AUNQUE EL PROGRAMA REORDENE (sigue al
-- ancla, no a un número fijo). NULL = al inicio de su ámbito. Si el ancla se borra →
-- SET NULL (la propia "flota" al inicio; el merge lo maneja). Entre varias propias con el
-- mismo ancla, desempata el `orden` existente. Solo aplica a entidades del temario.
alter table lxp.modulos   add column despues_de uuid references lxp.modulos(id)   on delete set null;
alter table lxp.lecciones add column despues_de uuid references lxp.lecciones(id) on delete set null;
alter table lxp.bloques   add column despues_de uuid references lxp.bloques(id)   on delete set null;
-- `despues_de` es un concepto de posicionamiento de lo PROPIO; lo heredado usa `orden`.
alter table lxp.modulos   add constraint modulos_despues_solo_propio   check (despues_de is null or grupo_id is not null);
alter table lxp.lecciones add constraint lecciones_despues_solo_propio check (despues_de is null or grupo_id is not null);
alter table lxp.bloques   add constraint bloques_despues_solo_propio   check (despues_de is null or grupo_id is not null);

-- ── 3) Índices parciales (lecturas rápidas a 800) ──
-- Camino del PROGRAMA (grupo_id IS NULL): mantiene tight el temario heredado que el builder
-- y el resolver leerán filtrando grupo_id en etapa 2.
create index modulos_prog_heredado_idx   on lxp.modulos    (programa_id, orden) where grupo_id is null;
create index lecciones_mod_heredado_idx  on lxp.lecciones  (modulo_id, orden)   where grupo_id is null;
create index bloques_lec_heredado_idx    on lxp.bloques    (leccion_id, orden)  where grupo_id is null;
-- Camino del GRUPO (grupo_id = X): el nuevo read "contenido propio del grupo X".
create index modulos_grupo_idx    on lxp.modulos    (grupo_id, programa_id, orden) where grupo_id is not null;
create index lecciones_grupo_idx  on lxp.lecciones  (grupo_id, modulo_id, orden)   where grupo_id is not null;
create index bloques_grupo_idx    on lxp.bloques    (grupo_id, leccion_id, orden)  where grupo_id is not null;
-- contenidos/actividades se leen por leccion_id (índice existente); el grupo_id solo lo usa
-- el candado RLS por fila. Partial ligero para los pocos reads por grupo.
create index contenidos_grupo_idx  on lxp.contenidos  (grupo_id) where grupo_id is not null;
create index actividades_grupo_idx on lxp.actividades (grupo_id) where grupo_id is not null;

-- ── 4) RLS: candado CROSS-GRUPO sin tocar lo heredado (policies RESTRICTIVAS) ──
-- La RLS de lectura de estas tablas hoy gatea por PROGRAMA (programa_visible_para_mi /
-- leccion_visible_para_mi, funciones SECURITY DEFINER que NO conocen grupo_id). Un propio
-- (grupo_id set) cuelga de un programa visible → la policy PERMISIVA actual lo dejaría ver a
-- TODOS los grupos del programa = FUGA. Para cerrarlo SIN cambiar la policy heredada se
-- añade una policy RESTRICTIVA (se AND-ea con la permisiva):
--   · grupo_id IS NULL        → TRUE (lo heredado pasa trivial; comportamiento idéntico).
--   · es_autoria()            → el diseñador/admin (construye lo propio) lo ve.
--   · es_miembro_grupo(grupo_id) → staff (es_staff) o el alumno inscrito a ESE grupo.
-- Un alumno de OTRO grupo: ninguna rama → la restrictiva FALLA → NO lo ve (aunque la
-- permisiva por-programa lo permitiera). La ESCRITURA ya la gatea la policy *_write
-- (es_autoria) existente → no hace falta policy nueva de escritura.
create policy modulos_grupo_aislado on lxp.modulos as restrictive for select to authenticated
  using (grupo_id is null or lxp.es_autoria() or lxp.es_miembro_grupo(grupo_id));
create policy lecciones_grupo_aislado on lxp.lecciones as restrictive for select to authenticated
  using (grupo_id is null or lxp.es_autoria() or lxp.es_miembro_grupo(grupo_id));
create policy bloques_grupo_aislado on lxp.bloques as restrictive for select to authenticated
  using (grupo_id is null or lxp.es_autoria() or lxp.es_miembro_grupo(grupo_id));
create policy contenidos_grupo_aislado on lxp.contenidos as restrictive for select to authenticated
  using (grupo_id is null or lxp.es_autoria() or lxp.es_miembro_grupo(grupo_id));
create policy actividades_grupo_aislado on lxp.actividades as restrictive for select to authenticated
  using (grupo_id is null or lxp.es_autoria() or lxp.es_miembro_grupo(grupo_id));

-- GRANT: no hay tabla nueva (solo columnas) → los GRANT existentes de estas tablas cubren
-- las columnas nuevas. No se agregó tabla auxiliar de posición (despues_de es columna).

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (manual):
--   drop policy if exists modulos_grupo_aislado on lxp.modulos;  -- (y las otras 4)
--   drop index if exists modulos_prog_heredado_idx, ... ;        -- (los 8)
--   alter table lxp.modulos drop constraint modulos_despues_solo_propio; -- (y las otras 2)
--   alter table lxp.modulos drop column despues_de;              -- (modulos/lecciones/bloques)
--   alter table lxp.modulos drop column grupo_id;                -- (las 5 tablas)
-- ═══════════════════════════════════════════════════════════════════════════
