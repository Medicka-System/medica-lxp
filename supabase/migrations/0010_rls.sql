-- ═══════════════════════════════════════════════════════════════════════════
-- 0010 · RLS y grants del LXP (§6/§10) — policies SOLO en el esquema `lxp`
--
-- Modelo Supabase: TODO usuario logueado usa el rol de BD `authenticated`; la
-- distinción de rol (alumno/docente/…) se hace EN LA POLICY vía lxp.rol_actual()
-- (no con roles de BD distintos). `service_role` (api/worker) omite RLS (bypassrls)
-- y escribe las proyecciones. `anon` no recibe grants → no ve nada.
--
-- Este archivo NO toca `public` (CORA) — regla 3 (§10).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Grants base ──
grant usage on schema lxp to anon, authenticated, service_role;

-- authenticated: DML sobre las tablas del LXP; RLS decide las filas.
grant select, insert, update, delete on all tables in schema lxp to authenticated;
-- service_role: acceso total (omite RLS) para workers/dominio.
grant all on all tables in schema lxp to service_role;

-- Proyecciones y stores escritos SOLO por el worker (service_role): authenticated
-- queda en SOLO LECTURA (§6: "la escribe el worker, no a mano").
revoke insert, update, delete on
  lxp.competencia_dominios, lxp.hitos, lxp.certificados,
  lxp.badges, lxp.badges_otorgados, lxp.documentos_rag
from authenticated;

-- perfiles: no se crean ni borran desde web (se provisionan leyendo el vínculo
-- de CORA · regla 5). authenticated solo lee y actualiza lo suyo.
revoke insert, delete on lxp.perfiles from authenticated;

-- ── Habilitar RLS en TODAS las tablas del LXP ──
alter table lxp.perfiles              enable row level security;
alter table lxp.programas             enable row level security;
alter table lxp.modulos               enable row level security;
alter table lxp.lecciones             enable row level security;
alter table lxp.contenidos            enable row level security;
alter table lxp.grupos                enable row level security;
alter table lxp.grupo_overrides       enable row level security;
alter table lxp.actividades           enable row level security;
alter table lxp.rubricas              enable row level security;
alter table lxp.entregas              enable row level security;
alter table lxp.foro_mensajes         enable row level security;
alter table lxp.bitacora_casos        enable row level security;
alter table lxp.validaciones          enable row level security;
alter table lxp.reportes              enable row level security;
alter table lxp.posts_ateneo          enable row level security;
alter table lxp.comentarios_ateneo    enable row level security;
alter table lxp.casos_biblioteca      enable row level security;
alter table lxp.simuladores           enable row level security;
alter table lxp.competencia_dominios  enable row level security;
alter table lxp.hitos                 enable row level security;
alter table lxp.certificados          enable row level security;
alter table lxp.badges                enable row level security;
alter table lxp.badges_otorgados      enable row level security;
alter table lxp.plantillas_reporte    enable row level security;
alter table lxp.calculadoras          enable row level security;
alter table lxp.recursos_docente      enable row level security;
alter table lxp.anuncios              enable row level security;
alter table lxp.consultas             enable row level security;
alter table lxp.consulta_mensajes     enable row level security;
alter table lxp.documentos_rag        enable row level security;
alter table lxp.eco_correcciones      enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- IDENTIDAD
-- ═══════════════════════════════════════════════════════════════════════════
-- perfiles: cada quien ve/edita el suyo; el staff ve todos.
create policy perfiles_select on lxp.perfiles
  for select to authenticated
  using (user_id = auth.uid() or lxp.es_staff());
create policy perfiles_update on lxp.perfiles
  for update to authenticated
  using (user_id = auth.uid() or lxp.es_staff())
  with check (user_id = auth.uid() or lxp.es_staff());

-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENIDO / AUTORÍA (lectura para inscritos; escritura = diseñador/admin · §5B)
-- ═══════════════════════════════════════════════════════════════════════════
-- Helper de patrón: lectura authenticated + escritura es_autoria().
create policy programas_read on lxp.programas
  for select to authenticated using (true);
create policy programas_write on lxp.programas
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy modulos_read on lxp.modulos
  for select to authenticated using (true);
create policy modulos_write on lxp.modulos
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy lecciones_read on lxp.lecciones
  for select to authenticated using (true);
create policy lecciones_write on lxp.lecciones
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy contenidos_read on lxp.contenidos
  for select to authenticated using (true);
create policy contenidos_write on lxp.contenidos
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy grupos_read on lxp.grupos
  for select to authenticated using (true);
create policy grupos_write on lxp.grupos
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy grupo_overrides_read on lxp.grupo_overrides
  for select to authenticated using (true);
create policy grupo_overrides_write on lxp.grupo_overrides
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy actividades_read on lxp.actividades
  for select to authenticated using (true);
create policy actividades_write on lxp.actividades
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy rubricas_read on lxp.rubricas
  for select to authenticated using (true);
create policy rubricas_write on lxp.rubricas
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

-- ═══════════════════════════════════════════════════════════════════════════
-- ACTIVIDAD DEL ALUMNO (entregas, foro)
-- ═══════════════════════════════════════════════════════════════════════════
create policy entregas_select on lxp.entregas
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());
create policy entregas_insert on lxp.entregas
  for insert to authenticated
  with check (id_alumno = auth.uid() and lxp.acceso_activo());
-- El alumno edita lo suyo; el docente califica.
create policy entregas_update on lxp.entregas
  for update to authenticated
  using (id_alumno = auth.uid() or lxp.es_docente_o_mas())
  with check (id_alumno = auth.uid() or lxp.es_docente_o_mas());

-- foro CERRADO del grupo. NOTA (Sprint 9): endurecer a membresía real del grupo
-- (la inscripción vive en CORA, legible con lxp.cora_grupos_de). Por ahora:
-- lectura para inscritos autenticados, escritura del propio autor con acceso.
create policy foro_select on lxp.foro_mensajes
  for select to authenticated using (auth.uid() is not null);
create policy foro_insert on lxp.foro_mensajes
  for insert to authenticated
  with check (autor_id = auth.uid() and lxp.acceso_activo());

-- ═══════════════════════════════════════════════════════════════════════════
-- PRÁCTICA (bitácora) — CORAZÓN DEL PRODUCTO
-- ═══════════════════════════════════════════════════════════════════════════
-- Alumno: solo lo SUYO y solo si acceso_activo. Staff: todo (valida).
create policy bitacora_select on lxp.bitacora_casos
  for select to authenticated
  using (lxp.es_staff() or (id_alumno = auth.uid() and lxp.acceso_activo()));
create policy bitacora_insert on lxp.bitacora_casos
  for insert to authenticated
  with check (lxp.es_staff() or (id_alumno = auth.uid() and lxp.acceso_activo()));
create policy bitacora_update on lxp.bitacora_casos
  for update to authenticated
  using (lxp.es_staff() or (id_alumno = auth.uid() and lxp.acceso_activo()))
  with check (lxp.es_staff() or (id_alumno = auth.uid() and lxp.acceso_activo()));
create policy bitacora_delete on lxp.bitacora_casos
  for delete to authenticated
  using (lxp.es_staff() or (id_alumno = auth.uid() and lxp.acceso_activo()));

-- validaciones: las escribe el docente; el alumno ve las de sus casos.
create policy validaciones_select on lxp.validaciones
  for select to authenticated
  using (
    lxp.es_docente_o_mas()
    or exists (
      select 1 from lxp.bitacora_casos c
      where c.id = caso_id and c.id_alumno = auth.uid()
    )
  );
create policy validaciones_write on lxp.validaciones
  for all to authenticated
  using (lxp.es_docente_o_mas()) with check (lxp.es_docente_o_mas());

-- reportes clínicos: del médico que los crea (datos de paciente · §10).
create policy reportes_select on lxp.reportes
  for select to authenticated
  using (id_medico = auth.uid() or lxp.es_staff());
create policy reportes_insert on lxp.reportes
  for insert to authenticated
  with check (id_medico = auth.uid());
create policy reportes_update on lxp.reportes
  for update to authenticated
  using (id_medico = auth.uid() or lxp.es_staff())
  with check (id_medico = auth.uid() or lxp.es_staff());

-- ═══════════════════════════════════════════════════════════════════════════
-- COMUNIDAD / ATENEO
-- ═══════════════════════════════════════════════════════════════════════════
create policy posts_ateneo_select on lxp.posts_ateneo
  for select to authenticated
  using (estado = 'aprobado' or autor_id = auth.uid() or lxp.es_staff());
create policy posts_ateneo_insert on lxp.posts_ateneo
  for insert to authenticated
  with check (autor_id = auth.uid() and lxp.acceso_activo());
create policy posts_ateneo_update on lxp.posts_ateneo
  for update to authenticated
  using (autor_id = auth.uid() or lxp.es_docente_o_mas())
  with check (autor_id = auth.uid() or lxp.es_docente_o_mas());
create policy posts_ateneo_delete on lxp.posts_ateneo
  for delete to authenticated
  using (autor_id = auth.uid() or lxp.es_docente_o_mas());

create policy comentarios_ateneo_select on lxp.comentarios_ateneo
  for select to authenticated
  using (
    lxp.es_staff()
    or exists (
      select 1 from lxp.posts_ateneo p
      where p.id = post_id
        and (p.estado = 'aprobado' or p.autor_id = auth.uid())
    )
  );
create policy comentarios_ateneo_insert on lxp.comentarios_ateneo
  for insert to authenticated
  with check (autor_id = auth.uid() and lxp.acceso_activo());
create policy comentarios_ateneo_update on lxp.comentarios_ateneo
  for update to authenticated
  using (autor_id = auth.uid() or lxp.es_docente_o_mas())
  with check (autor_id = auth.uid() or lxp.es_docente_o_mas());

-- ═══════════════════════════════════════════════════════════════════════════
-- BIBLIOTECA / SIMULADORES (verdad clínica = docente; publicado visible)
-- ═══════════════════════════════════════════════════════════════════════════
create policy casos_biblioteca_select on lxp.casos_biblioteca
  for select to authenticated
  using (publicado or lxp.es_staff());
create policy casos_biblioteca_write on lxp.casos_biblioteca
  for all to authenticated
  using (lxp.es_staff()) with check (lxp.es_staff());

create policy simuladores_select on lxp.simuladores
  for select to authenticated
  using (publicado or lxp.es_staff());
create policy simuladores_write on lxp.simuladores
  for all to authenticated
  using (lxp.es_autoria()) with check (lxp.es_autoria());

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPETENCIA / RECONOCIMIENTO (READ-ONLY desde web; las escribe el worker)
-- ═══════════════════════════════════════════════════════════════════════════
create policy competencia_select on lxp.competencia_dominios
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());

create policy hitos_select on lxp.hitos
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());

create policy certificados_select on lxp.certificados
  for select to authenticated
  using (id_alumno = auth.uid() or lxp.es_staff());

create policy badges_select on lxp.badges
  for select to authenticated using (true);

create policy badges_otorgados_select on lxp.badges_otorgados
  for select to authenticated
  using (id_perfil = auth.uid() or lxp.es_staff());

-- ═══════════════════════════════════════════════════════════════════════════
-- HERRAMIENTAS / COMUNICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
create policy plantillas_reporte_select on lxp.plantillas_reporte
  for select to authenticated using (publicado or lxp.es_staff());
create policy plantillas_reporte_write on lxp.plantillas_reporte
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy calculadoras_select on lxp.calculadoras
  for select to authenticated using (publicado or lxp.es_staff());
create policy calculadoras_write on lxp.calculadoras
  for all to authenticated using (lxp.es_autoria()) with check (lxp.es_autoria());

create policy recursos_docente_select on lxp.recursos_docente
  for select to authenticated
  using (id_docente = auth.uid() or lxp.es_docente_o_mas());
create policy recursos_docente_write on lxp.recursos_docente
  for all to authenticated
  using (id_docente = auth.uid()) with check (id_docente = auth.uid());

create policy anuncios_select on lxp.anuncios
  for select to authenticated using (auth.uid() is not null);
create policy anuncios_write on lxp.anuncios
  for all to authenticated
  using (lxp.es_docente_o_mas()) with check (lxp.es_docente_o_mas());

create policy consultas_select on lxp.consultas
  for select to authenticated
  using (id_alumno = auth.uid() or id_docente = auth.uid() or lxp.es_docente_o_mas());
create policy consultas_insert on lxp.consultas
  for insert to authenticated
  with check (id_alumno = auth.uid() and lxp.acceso_activo());
create policy consultas_update on lxp.consultas
  for update to authenticated
  using (id_alumno = auth.uid() or id_docente = auth.uid() or lxp.es_docente_o_mas())
  with check (id_alumno = auth.uid() or id_docente = auth.uid() or lxp.es_docente_o_mas());

create policy consulta_mensajes_select on lxp.consulta_mensajes
  for select to authenticated
  using (
    lxp.es_docente_o_mas()
    or exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid())
    )
  );
create policy consulta_mensajes_insert on lxp.consulta_mensajes
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from lxp.consultas q
      where q.id = consulta_id
        and (q.id_alumno = auth.uid() or q.id_docente = auth.uid() or lxp.es_docente_o_mas())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ECO / RAG (interno; solo staff lee, worker escribe con service_role)
-- ═══════════════════════════════════════════════════════════════════════════
create policy documentos_rag_select on lxp.documentos_rag
  for select to authenticated using (lxp.es_staff());

create policy eco_correcciones_select on lxp.eco_correcciones
  for select to authenticated using (lxp.es_docente_o_mas());
create policy eco_correcciones_insert on lxp.eco_correcciones
  for insert to authenticated
  with check (id_docente = auth.uid() and lxp.es_docente_o_mas());
