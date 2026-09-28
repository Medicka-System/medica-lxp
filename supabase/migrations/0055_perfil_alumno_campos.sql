-- ═══════════════════════════════════════════════════════════════════════════
-- 0055 · Perfil del alumno — campos editables + preferencias (§5A, pantallas
--        /perfil y /ajustes)
--
-- `lxp.perfiles` ya tenía `especialidad`/`sede` (0032, "meta" del Ateneo). Aquí
-- se agregan los campos que el alumno edita en Mi perfil y las preferencias que
-- guarda en Ajustes:
--   • sobre_mi      — bio libre, visible en la comunidad del Ateneo.
--   • intereses     — tags (#…) del perfil.
--   • whatsapp      — solo para avisos urgentes (si los activa en Ajustes).
--   • preferencias  — jsonb con avisos/privacidad/lectura/idioma (Ajustes).
--
-- Todo es del propio alumno: la policy `perfiles_update` (0010) ya restringe la
-- escritura a `user_id = auth.uid()` y el GRANT UPDATE a nivel tabla cubre las
-- columnas nuevas — no hace falta policy ni grant adicional. NUNCA toca `public`
-- (CORA · §10): matrícula/programa/grupo se leen por funciones SECURITY DEFINER.
-- ═══════════════════════════════════════════════════════════════════════════
alter table lxp.perfiles
  add column if not exists sobre_mi     text,
  add column if not exists intereses    text[] not null default '{}',
  add column if not exists whatsapp     text,
  add column if not exists preferencias jsonb  not null default '{}'::jsonb;
