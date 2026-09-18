-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 · Competencia y reconocimiento (§6)
-- competencia_dominios (proyección I-AIM — la ESCRIBE el worker, no a mano)
-- hitos · certificados · badges · badges_otorgados
--
-- ⚠️ competencia_dominios es READ-ONLY desde `web` (§2/§6): authenticated solo
--    SELECT; la escribe el worker con service_role (bypassrls). Se refuerza en 0010.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── competencia_dominios: proyección por alumno × dominio I-AIM ──
create table lxp.competencia_dominios (
  id             uuid primary key default gen_random_uuid(),
  id_alumno      uuid not null references lxp.perfiles(user_id) on delete cascade,
  dominio_iaim   lxp.dominio_iaim not null,
  horas          numeric(8,2) not null default 0,
  nivel          numeric(5,2) not null default 0,      -- 0..100 competencia estimada
  decaimiento    numeric(5,2) not null default 0,      -- caída detectada (§8)
  proximo_repaso date,                                 -- repaso espaciado (§1/§8)
  actualizado_en timestamptz not null default now(),
  unique (id_alumno, dominio_iaim)
);

create index competencia_alumno_idx on lxp.competencia_dominios (id_alumno);

-- ── hitos (100/500/1000h…) ──
create table lxp.hitos (
  id             uuid primary key default gen_random_uuid(),
  id_alumno      uuid not null references lxp.perfiles(user_id) on delete cascade,
  tipo           text not null,        -- p.ej. 'horas_100' | 'horas_500' | 'horas_1000'
  horas_umbral   numeric(8,2) not null,
  alcanzado_en   timestamptz not null default now(),
  unique (id_alumno, tipo)
);

create index hitos_alumno_idx on lxp.hitos (id_alumno);

-- ── certificados ──
create table lxp.certificados (
  id             uuid primary key default gen_random_uuid(),
  id_alumno      uuid not null references lxp.perfiles(user_id) on delete cascade,
  hito_id        uuid references lxp.hitos(id) on delete set null,
  folio          text not null unique,
  titulo         text not null,
  pdf_ref        text,
  emitido_en     timestamptz not null default now()
);

create index certificados_alumno_idx on lxp.certificados (id_alumno);

-- ── badges (catálogo) + badges_otorgados ──
create table lxp.badges (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null unique,
  nombre         text not null,
  descripcion    text,
  icono_ref      text,
  -- Regla automática opcional (por hitos/casos/competencia/racha · §8) o manual.
  regla          jsonb,
  created_at     timestamptz not null default now()
);

create table lxp.badges_otorgados (
  id             uuid primary key default gen_random_uuid(),
  badge_id       uuid not null references lxp.badges(id) on delete cascade,
  -- Alumnos y docentes pueden recibir badges (§6).
  id_perfil      uuid not null references lxp.perfiles(user_id) on delete cascade,
  otorgado_por   uuid references lxp.perfiles(user_id) on delete set null,  -- null = automático
  otorgado_en    timestamptz not null default now(),
  unique (badge_id, id_perfil)
);

create index badges_otorgados_perfil_idx on lxp.badges_otorgados (id_perfil);
