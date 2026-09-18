-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 · Comunidad / Ateneo y verdad de casos (§6)
-- posts_ateneo (caso | encuesta | anuncio_comunidad) · comentarios_ateneo
-- casos_biblioteca (acervo curado + VERDAD ESTRUCTURADA que alimenta a Eco)
-- simuladores (config)
--
-- Ateneo = comunidad ABIERTA y transversal (fuera de los cursos · §1). No confundir
-- con el foro de lección (0003), que es cerrado del grupo.
-- ═══════════════════════════════════════════════════════════════════════════

create type lxp.post_ateneo_tipo as enum ('caso', 'encuesta', 'anuncio_comunidad');

create type lxp.simulador_tipo as enum ('interpretacion', 'reporte');

-- ── posts_ateneo ──
create table lxp.posts_ateneo (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid not null references lxp.perfiles(user_id) on delete cascade,
  tipo          lxp.post_ateneo_tipo not null,
  titulo        text not null,
  vineta        text,
  -- Referencia DICOM anonimizada en object storage (miniatura/cine-loop · §9).
  dicom_ref     text,
  cuerpo        text,
  -- Moderación: los casos entran pendientes; el docente aprueba (§6 RLS).
  estado        lxp.estado_validacion not null default 'pendiente',
  visibilidad   text not null default 'inscritos',   -- inscritos | publico
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index posts_ateneo_estado_idx on lxp.posts_ateneo (estado);
create index posts_ateneo_autor_idx on lxp.posts_ateneo (autor_id);

create trigger posts_ateneo_touch
  before update on lxp.posts_ateneo
  for each row execute function lxp.touch_updated_at();

-- ── comentarios_ateneo (interconsulta, upvotes, flag de validación docente) ──
create table lxp.comentarios_ateneo (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references lxp.posts_ateneo(id) on delete cascade,
  autor_id      uuid not null references lxp.perfiles(user_id) on delete cascade,
  cuerpo        text not null,
  upvotes       integer not null default 0,
  -- El docente marca una respuesta como validada clínicamente (§5B).
  validado_por  uuid references lxp.perfiles(user_id) on delete set null,
  created_at    timestamptz not null default now()
);

create index comentarios_ateneo_post_idx on lxp.comentarios_ateneo (post_id);

-- ── casos_biblioteca: acervo curado + VERDAD ESTRUCTURADA del caso (§6/§7A) ──
-- Contrato mínimo que habilita a Eco (evaluación + simuladores). La verdad clínica
-- la define el DOCENTE (§5B); no es texto libre.
create table lxp.casos_biblioteca (
  id                  uuid primary key default gen_random_uuid(),
  curador_id          uuid references lxp.perfiles(user_id) on delete set null,
  titulo              text not null,
  organo              text,
  dominio_iaim        lxp.dominio_iaim,
  dicom_ref           text,
  -- Verdad estructurada (contrato · §7A): hallazgos clave, diagnóstico correcto,
  -- puntos de aprendizaje, errores comunes.
  hallazgos_clave     jsonb not null default '[]'::jsonb,
  diagnostico_correcto text,
  puntos_aprendizaje  jsonb not null default '[]'::jsonb,
  errores_comunes     jsonb not null default '[]'::jsonb,
  publicado           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index casos_biblioteca_dominio_idx on lxp.casos_biblioteca (dominio_iaim);
create index casos_biblioteca_pub_idx on lxp.casos_biblioteca (publicado);

create trigger casos_biblioteca_touch
  before update on lxp.casos_biblioteca
  for each row execute function lxp.touch_updated_at();

-- ── simuladores (config · §6) ──
create table lxp.simuladores (
  id            uuid primary key default gen_random_uuid(),
  tipo          lxp.simulador_tipo not null,
  nombre        text not null,
  descripcion   text,
  -- Casos base del banco curado y parámetros de la sesión.
  casos_base    jsonb not null default '[]'::jsonb,
  parametros    jsonb not null default '{}'::jsonb,
  publicado     boolean not null default false,
  created_at    timestamptz not null default now()
);
